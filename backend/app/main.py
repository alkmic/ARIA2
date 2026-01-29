from __future__ import annotations

from datetime import date
from pathlib import Path
from typing import Any, Optional

import os
import time

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlmodel import Session, and_, select

from .agent_tools import (
    ToolTraceEntry,
    build_battlecard,
    build_next_actions,
    build_objectives,
    build_snapshot,
    compliance_guard,
    generate_pitch,
    last_interactions_summary,
    news_tool,
    rag_evidence,
    sql_tool,
    summarize_conversations,
)
from .db import get_session, init_db
from .demo_data import seed_demo_data
from .ingest import ingest_excel
from .models import ConversationNote, HCP, Pitch, Product, ScoreExplanation, Visit
from .nl2sql import generate_sql, validate_sql
from .scoring import score_hcp
from .voice import anonymize_text, compliance_for_report, extract_after_visit_report

load_dotenv()

app = FastAPI(title="ARIA — Air Liquide Intelligent Assistant")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class PitchCreate(BaseModel):
    hcp_id: str
    channel: str
    length_label: str
    word_limit: int
    content_json: str


class PrebriefRequest(BaseModel):
    hcp_id: str
    product_id: str
    optional_context: Optional[str] = None


class PitchRequest(BaseModel):
    hcp_id: str
    product_id: str
    length: str
    word_limit: int
    tone: str
    section_to_rewrite: Optional[str] = None


class TranscribeResponse(BaseModel):
    transcript_text: str
    used_fallback: bool


class AfterVisitRequest(BaseModel):
    hcp_id: str
    transcript_text: str


class CrmPushRequest(BaseModel):
    hcp_id: str
    outcome: str
    channel_used: str
    note_text: str
    next_action_due: Optional[str] = None


class Nl2SqlRequest(BaseModel):
    question: str


def _trace(tool_name: str, start: float, status: str, preview: str) -> ToolTraceEntry:
    elapsed_ms = int((time.perf_counter() - start) * 1000)
    return ToolTraceEntry(
        tool_name=tool_name, status=status, elapsed_ms=elapsed_ms, short_result_preview=preview
    )


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/init-db")
def init_database(
    excel_path: Optional[str] = None, session: Session = Depends(get_session)
) -> dict[str, int]:
    path = Path(excel_path or "/mnt/data/Scoring_Factice_BPCO.xlsx")
    if not path.exists():
        raise HTTPException(status_code=404, detail="Excel file not found")
    count = ingest_excel(path, session)
    seed_demo_data(session)
    return {"ingested": count}


@app.get("/api/hcps")
def list_hcps(
    specialty: Optional[str] = None,
    kol: Optional[bool] = None,
    channel: Optional[str] = None,
    session: Session = Depends(get_session),
) -> list[HCP]:
    query = select(HCP)
    filters = []
    if specialty:
        filters.append(HCP.specialty_label == specialty)
    if kol is not None:
        filters.append(HCP.kol == kol)
    if channel:
        filters.append(HCP.preferred_channel == channel)
    if filters:
        query = query.where(and_(*filters))
    return list(session.exec(query))


@app.get("/api/hcps/{hcp_id}")
def get_hcp(hcp_id: str, session: Session = Depends(get_session)) -> HCP:
    hcp = session.get(HCP, hcp_id)
    if not hcp:
        raise HTTPException(status_code=404, detail="HCP not found")
    return hcp


@app.get("/api/hcps/{hcp_id}/timeline")
def hcp_timeline(hcp_id: str, session: Session = Depends(get_session)) -> dict[str, list]:
    visits = list(session.exec(select(Visit).where(Visit.hcp_id == hcp_id)))
    notes = list(session.exec(select(ConversationNote).where(ConversationNote.hcp_id == hcp_id)))
    return {"visits": visits, "notes": notes}


@app.get("/api/products")
def list_products(session: Session = Depends(get_session)) -> list[Product]:
    return list(session.exec(select(Product)))


@app.get("/api/recommendations/today")
def recommendations(
    limit: int = Query(5, ge=1, le=50), session: Session = Depends(get_session)
) -> list[ScoreExplanation]:
    hcps = list(session.exec(select(HCP)))
    recommendations: list[ScoreExplanation] = []
    for hcp in hcps:
        visits = list(session.exec(select(Visit).where(Visit.hcp_id == hcp.id)))
        notes = list(session.exec(select(ConversationNote).where(ConversationNote.hcp_id == hcp.id)))
        recommendations.append(score_hcp(hcp, visits, notes))
    recommendations.sort(key=lambda r: r.score, reverse=True)
    return recommendations[:limit]


@app.post("/api/pitches")
def create_pitch(payload: PitchCreate, session: Session = Depends(get_session)) -> dict[str, str]:
    hcp = session.get(HCP, payload.hcp_id)
    if not hcp:
        raise HTTPException(status_code=404, detail="HCP not found")
    pitch = Pitch(
        hcp_id=hcp.id,
        channel=payload.channel,
        length_label=payload.length_label,
        word_limit=payload.word_limit,
        content_json=payload.content_json,
    )
    session.add(pitch)
    session.commit()
    session.refresh(pitch)
    return {"id": str(pitch.id), "message": "Pitch stored for demo sync."}


@app.post("/api/prebrief")
def prebrief(payload: PrebriefRequest, session: Session = Depends(get_session)) -> dict[str, Any]:
    hcp = session.get(HCP, payload.hcp_id)
    if not hcp:
        raise HTTPException(status_code=404, detail="HCP not found")
    product = session.get(Product, payload.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    tool_trace: list[ToolTraceEntry] = []
    knowledge_path = Path(__file__).resolve().parent.parent / "knowledge"

    start = time.perf_counter()
    try:
        sql_result = sql_tool(session, "SELECT COUNT(*) AS total_hcps FROM hcp")
        tool_trace.append(_trace("sql_tool", start, "success", f"{sql_result[:1]}"))
    except Exception as exc:
        tool_trace.append(_trace("sql_tool", start, "error", str(exc)[:80]))

    start = time.perf_counter()
    summary = summarize_conversations(session, payload.hcp_id)
    tool_trace.append(_trace("summarize_conversations", start, "success", "notes+visit"))

    start = time.perf_counter()
    evidence = rag_evidence("BPCO oxygen therapy", knowledge_path)
    tool_trace.append(_trace("rag_evidence", start, "success", f"{len(evidence)} snippets"))

    start = time.perf_counter()
    news = news_tool(["BPCO", "oxygen", "respiratory"])
    tool_trace.append(_trace("news_tool", start, "success", f"{len(news)} items"))

    summary_text = last_interactions_summary(summary)
    objectives = build_objectives(hcp)
    battlecard = build_battlecard(session, hcp)
    next_actions = build_next_actions()
    compliance = compliance_guard(payload.optional_context or "", product)

    return {
        "hcp_snapshot": build_snapshot(hcp),
        "last_interactions_summary": summary_text,
        "suggested_objectives": objectives,
        "battlecard": battlecard,
        "evidence_highlights": evidence,
        "news_highlights": news,
        "next_best_actions": next_actions,
        "tool_trace": [entry.__dict__ for entry in tool_trace],
        "compliance_status": compliance["compliance_status"],
        "compliance_issues": compliance["issues"],
    }


@app.post("/api/pitch")
def pitch(payload: PitchRequest, session: Session = Depends(get_session)) -> dict[str, Any]:
    hcp = session.get(HCP, payload.hcp_id)
    if not hcp:
        raise HTTPException(status_code=404, detail="HCP not found")
    product = session.get(Product, payload.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    tool_trace: list[ToolTraceEntry] = []
    knowledge_path = Path(__file__).resolve().parent.parent / "knowledge"
    start = time.perf_counter()
    summary = summarize_conversations(session, payload.hcp_id)
    tool_trace.append(_trace("summarize_conversations", start, "success", "notes+visit"))

    start = time.perf_counter()
    evidence = rag_evidence("BPCO oxygen therapy", knowledge_path)
    tool_trace.append(_trace("rag_evidence", start, "success", f"{len(evidence)} snippets"))

    start = time.perf_counter()
    news = news_tool(["BPCO", "oxygen", "respiratory"])
    tool_trace.append(_trace("news_tool", start, "success", f"{len(news)} items"))

    context = {
        "last_interactions": summary,
        "evidence": evidence,
        "news": news,
    }
    start = time.perf_counter()
    groq_key = os.getenv("GROQ_API_KEY")
    generated = generate_pitch(
        hcp=hcp,
        product=product,
        tone=payload.tone,
        length=payload.length,
        word_limit=payload.word_limit,
        context=context,
        section_to_rewrite=payload.section_to_rewrite,
        groq_key=groq_key,
    )
    tool_trace.append(_trace("groq_chat", start, "success", "pitch generated"))

    pitch_text = generated.get("pitch_text", "")
    sections = generated.get("sections", {})
    compliance = compliance_guard(pitch_text, product)

    return {
        "pitch_text": compliance["sanitized_text"],
        "sections": sections,
        "compliance_status": compliance["compliance_status"],
        "compliance_issues": compliance["issues"],
        "tool_trace": [entry.__dict__ for entry in tool_trace],
    }


@app.post("/api/transcribe")
async def transcribe_audio(
    file: Optional[UploadFile] = File(None), fallback_text: Optional[str] = Form(None)
) -> TranscribeResponse:
    if not file and not fallback_text:
        raise HTTPException(status_code=400, detail="Provide audio file or fallback text.")
    if fallback_text:
        return TranscribeResponse(transcript_text=fallback_text, used_fallback=True)
    try:
        from faster_whisper import WhisperModel
        import tempfile

        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name
        model = WhisperModel("base", compute_type="int8")
        segments, _info = model.transcribe(tmp_path)
        text = " ".join(segment.text for segment in segments).strip()
        return TranscribeResponse(transcript_text=text, used_fallback=False)
    except Exception:
        return TranscribeResponse(transcript_text=fallback_text or "", used_fallback=True)


@app.post("/api/after_visit_report")
def after_visit_report(payload: AfterVisitRequest, session: Session = Depends(get_session)) -> dict[str, Any]:
    hcp = session.get(HCP, payload.hcp_id)
    if not hcp:
        raise HTTPException(status_code=404, detail="HCP not found")
    product = session.exec(select(Product)).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    groq_key = os.getenv("GROQ_API_KEY")
    anonymized = anonymize_text(payload.transcript_text)
    report = extract_after_visit_report(anonymized.anonymized, groq_key)
    compliance = compliance_for_report(report, product)
    return {
        "anonymization": {"before": anonymized.original, "after": anonymized.anonymized},
        "report": report,
        "compliance_status": compliance["compliance_status"],
        "compliance_issues": compliance["issues"],
    }


@app.post("/api/crm/push")
def crm_push(payload: CrmPushRequest, session: Session = Depends(get_session)) -> dict[str, Any]:
    hcp = session.get(HCP, payload.hcp_id)
    if not hcp:
        raise HTTPException(status_code=404, detail="HCP not found")
    visit = Visit(
        hcp_id=hcp.id,
        date=date.today(),
        duration_min=30,
        outcome=payload.outcome,
        next_action_due=date.fromisoformat(payload.next_action_due)
        if payload.next_action_due
        else None,
        channel_used=payload.channel_used,
    )
    note = ConversationNote(
        hcp_id=hcp.id,
        date=date.today(),
        note_text=payload.note_text,
        tags_json='["after_visit"]',
        competitor_mentioned_bool=False,
    )
    session.add(visit)
    session.add(note)
    session.commit()
    return {
        "status": "saved",
        "diff_preview": {
            "visit": {
                "date": visit.date.isoformat(),
                "outcome": visit.outcome,
                "channel_used": visit.channel_used,
            },
            "note": {"date": note.date.isoformat(), "note_text": note.note_text},
        },
    }


@app.post("/api/nl2sql")
def nl2sql(payload: Nl2SqlRequest, session: Session = Depends(get_session)) -> dict[str, Any]:
    groq_key = os.getenv("GROQ_API_KEY")
    generated = generate_sql(payload.question, groq_key)
    try:
        validated_sql = validate_sql(generated["sql"])
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    rows = sql_tool(session, validated_sql)
    return {
        "sql": validated_sql,
        "rationale_short": generated.get("rationale_short", ""),
        "chart_hint": generated.get("chart_hint", "table"),
        "rows": rows,
    }


@app.get("/api/insights")
def insights(
    specialty: Optional[str] = None,
    channel: Optional[str] = None,
    city: Optional[str] = None,
    kol: Optional[bool] = None,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    query = select(HCP)
    filters = []
    if specialty:
        filters.append(HCP.specialty_label == specialty)
    if channel:
        filters.append(HCP.preferred_channel == channel)
    if city:
        filters.append(HCP.city == city)
    if kol is not None:
        filters.append(HCP.kol == kol)
    if filters:
        query = query.where(and_(*filters))
    hcps = list(session.exec(query))
    visits = list(session.exec(select(Visit)))
    overdue_actions = len([v for v in visits if v.next_action_due and v.next_action_due < date.today()])
    recent_visits = len(
        [v for v in visits if (date.today() - v.date).days <= 60]
    )
    coverage = round((recent_visits / max(len(hcps), 1)) * 100, 1)
    top_opps = [
        {"hcp_id": h.id, "name": f"{h.first_name} {h.last_name}", "vingtiles": h.vingtiles}
        for h in sorted(hcps, key=lambda x: x.vingtiles, reverse=True)[:5]
    ]
    competitor_risk = [
        {"hcp_id": n.hcp_id, "date": n.date.isoformat()}
        for n in session.exec(
            select(ConversationNote).where(ConversationNote.competitor_mentioned_bool == True)  # noqa: E712
        )
    ]
    return {
        "kpis": {
            "visits_per_month": len(visits),
            "coverage_pct": coverage,
            "overdue_actions": overdue_actions,
        },
        "top_opportunities": top_opps,
        "competitor_risk": competitor_risk,
    }
