from __future__ import annotations

from datetime import date
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query
from sqlmodel import Session, and_, select

from .db import get_session, init_db
from .demo_data import seed_demo_data
from .ingest import ingest_excel
from .models import ConversationNote, HCP, ScoreExplanation, Visit
from .scoring import score_hcp

load_dotenv()

app = FastAPI(title="ARIA — Air Liquide Intelligent Assistant")


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
def pitches_stub(
    hcp_id: str, channel: str, session: Session = Depends(get_session)
) -> dict[str, str | date]:
    hcp = session.get(HCP, hcp_id)
    if not hcp:
        raise HTTPException(status_code=404, detail="HCP not found")
    return {
        "hcp_id": str(hcp_id),
        "channel": channel,
        "message": "LLM pitch generation will be enabled in a later iteration.",
        "generated_at": date.today(),
    }
