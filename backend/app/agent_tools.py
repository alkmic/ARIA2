from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

import requests
from sqlalchemy import text
from sqlmodel import Session, select

from .models import Competitor, ConversationNote, HCP, Product, Visit

GROQ_BASE_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.1-8b-instant"


@dataclass
class ToolTraceEntry:
    tool_name: str
    status: str
    elapsed_ms: int
    short_result_preview: str


def _trace(tool_name: str, start: float, status: str, preview: str) -> ToolTraceEntry:
    elapsed_ms = int((time.perf_counter() - start) * 1000)
    return ToolTraceEntry(
        tool_name=tool_name, status=status, elapsed_ms=elapsed_ms, short_result_preview=preview
    )


def sql_tool(session: Session, query: str) -> list[dict[str, Any]]:
    if not re.match(r"^\\s*select\\s", query, re.IGNORECASE):
        raise ValueError("Only SELECT statements are allowed.")
    if ";" in query.strip().rstrip(";"):
        raise ValueError("Only single SELECT statements are allowed.")
    result = session.exec(text(query))
    rows: list[dict[str, Any]] = []
    for row in result:
        if isinstance(row, dict):
            rows.append(row)
        else:
            rows.append(row.model_dump() if hasattr(row, "model_dump") else dict(row))
    return rows


def summarize_conversations(session: Session, hcp_id: str) -> dict[str, Any]:
    notes = list(
        session.exec(
            select(ConversationNote)
            .where(ConversationNote.hcp_id == hcp_id)
            .order_by(ConversationNote.date.desc())
            .limit(2)
        )
    )
    visits = list(
        session.exec(
            select(Visit)
            .where(Visit.hcp_id == hcp_id)
            .order_by(Visit.date.desc())
            .limit(1)
        )
    )
    note_summary = [
        {"date": note.date.isoformat(), "text": note.note_text} for note in notes if note
    ]
    visit_summary = (
        {
            "date": visits[0].date.isoformat(),
            "outcome": visits[0].outcome,
            "channel": visits[0].channel_used,
        }
        if visits
        else None
    )
    return {"notes": note_summary, "last_visit": visit_summary}


def _load_knowledge_files(knowledge_path: Path) -> list[dict[str, str]]:
    docs: list[dict[str, str]] = []
    if not knowledge_path.exists():
        return docs
    for path in knowledge_path.glob("**/*"):
        if path.suffix.lower() in {".txt", ".md"}:
            docs.append({"source": path.name, "text": path.read_text(encoding="utf-8")})
        elif path.suffix.lower() == ".pdf":
            try:
                from pypdf import PdfReader

                reader = PdfReader(str(path))
                for i, page in enumerate(reader.pages, start=1):
                    text = page.extract_text() or ""
                    if text.strip():
                        docs.append({"source": f"{path.name}#page={i}", "text": text})
            except Exception:
                continue
    return docs


def _embedding_backend():
    try:
        from sentence_transformers import SentenceTransformer

        model = SentenceTransformer("all-MiniLM-L6-v2")
        return model
    except Exception:
        return None


def rag_evidence(query: str, knowledge_path: Path) -> list[dict[str, str]]:
    docs = _load_knowledge_files(knowledge_path)
    if not docs:
        return []
    model = _embedding_backend()
    if model is None:
        matches = [doc for doc in docs if query.lower() in doc["text"].lower()]
        return [
            {"snippet": doc["text"][:240].strip(), "source": doc["source"]}
            for doc in matches[:3]
        ]
    try:
        import faiss
        import numpy as np

        embeddings = model.encode([doc["text"] for doc in docs], convert_to_numpy=True)
        dimension = embeddings.shape[1]
        index = faiss.IndexFlatL2(dimension)
        index.add(embeddings)
        query_vec = model.encode([query], convert_to_numpy=True)
        distances, indices = index.search(query_vec, 3)
        results = []
        for idx in indices[0]:
            doc = docs[int(idx)]
            results.append(
                {"snippet": doc["text"][:240].strip(), "source": doc["source"]}
            )
        return results
    except Exception:
        return []


def news_tool(keywords: Iterable[str]) -> list[dict[str, str]]:
    try:
        import feedparser
    except Exception:
        return []
    items: list[dict[str, str]] = []
    query = "+".join(keywords)
    feeds = [
        f"https://news.google.com/rss/search?q={query}&hl=fr&gl=FR&ceid=FR:fr",
        f"https://api.gdeltproject.org/api/v2/doc/doc?query={query}&format=rss",
    ]
    for feed_url in feeds:
        feed = feedparser.parse(feed_url)
        for entry in feed.entries[:3]:
            items.append(
                {
                    "title": entry.get("title", ""),
                    "source": entry.get("source", {}).get("title", "RSS"),
                    "date": entry.get("published", ""),
                    "summary": entry.get("summary", "")[:200],
                }
            )
        if items:
            break
    return items[:3]


def compliance_guard(text: str, product: Product) -> dict[str, Any]:
    issues = []
    approved = json.loads(product.approved_claims_json)
    blocked = json.loads(product.do_not_say_json)
    sanitized = text
    status = "PASS"

    for phrase in blocked:
        if phrase.lower() in text.lower():
            issues.append(f"Blocked phrase: {phrase}")
            sanitized = re.sub(phrase, "[redacted]", sanitized, flags=re.IGNORECASE)
            status = "BLOCK"

    risky = ["cure", "guarantee", "no side effects", "medical advice"]
    for phrase in risky:
        if phrase in text.lower():
            issues.append(f"Risky claim: {phrase}")
            status = "WARN" if status != "BLOCK" else status

    if approved and not any(claim.lower() in text.lower() for claim in approved):
        issues.append("No approved claims referenced.")
        status = "WARN" if status != "BLOCK" else status

    return {
        "sanitized_text": sanitized,
        "compliance_status": status,
        "issues": issues,
    }


def _fallback_pitch(hcp: HCP, length: str, word_limit: int) -> dict[str, str]:
    opening = (
        f"Bonjour Dr {hcp.last_name}, merci pour votre temps. Voici un point sur l'accompagnement BPCO."
    )
    technical = (
        "Notre approche combine dispositif portable et coordination domicile pour améliorer l'adhérence."
    )
    objections = (
        "Face à la concurrence, nous mettons en avant la continuité du service et la qualité du suivi."
    )
    closing = "Souhaitez-vous planifier une revue clinique dans les prochaines semaines ?"
    full_text = "\n\n".join([opening, technical, objections, closing])
    return {
        "pitch_text": full_text[:word_limit],
        "sections": {
            "opening": opening,
            "technical": technical,
            "objections": objections,
            "closing": closing,
        },
    }


def generate_pitch(
    *,
    hcp: HCP,
    product: Product,
    tone: str,
    length: str,
    word_limit: int,
    context: dict[str, Any],
    section_to_rewrite: str | None = None,
    groq_key: str | None = None,
) -> dict[str, Any]:
    if not groq_key:
        return _fallback_pitch(hcp, length, word_limit)

    system_prompt = (
        "You are ARIA, a compliant assistant. Return JSON with keys pitch_text and sections "
        "(opening, technical, objections, closing). Do not include medical advice or off-label claims."
    )
    user_prompt = {
        "hcp": {
            "name": f"{hcp.first_name} {hcp.last_name}",
            "specialty": hcp.specialty_label,
            "city": hcp.city,
        },
        "product": {"name": product.name, "indications": product.indications},
        "context": context,
        "tone": tone,
        "length": length,
        "word_limit": word_limit,
        "section_to_rewrite": section_to_rewrite,
    }
    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(user_prompt)},
        ],
        "temperature": 0.3,
    }
    response = requests.post(
        GROQ_BASE_URL,
        headers={"Authorization": f"Bearer {groq_key}"},
        json=payload,
        timeout=20,
    )
    if response.status_code != 200:
        return _fallback_pitch(hcp, length, word_limit)
    content = response.json()["choices"][0]["message"]["content"]
    try:
        data = json.loads(content)
        return data
    except json.JSONDecodeError:
        return _fallback_pitch(hcp, length, word_limit)


def build_battlecard(session: Session, hcp: HCP) -> dict[str, str]:
    competitor = session.exec(select(Competitor)).first()
    competitor_name = competitor.name if competitor else "Competitor"
    return {
        "air_liquide": "Service réseau national, support patient, continuité clinique.",
        "competitor": f"{competitor_name}: positionnement prix ou dispositif portable.",
        "win_themes": "Fiabilité, suivi patient, coordination domicile.",
    }


def build_objectives(hcp: HCP) -> list[str]:
    objectives = [
        "Reconfirmer les parcours BPCO prioritaires.",
        "Aligner l'équipe sur les ressources d'onboarding patient.",
        "Présenter les options de suivi d'adhérence à 30 jours.",
    ]
    if hcp.kol:
        objectives.insert(0, "Valoriser le rôle KOL et recueillir feedback clinique.")
    return objectives[:3]


def build_next_actions() -> list[str]:
    return [
        "Planifier une démonstration produit ciblée.",
        "Partager un kit éducatif patient personnalisé.",
        "Fixer la prochaine revue de résultats cliniques.",
    ]


def build_snapshot(hcp: HCP) -> dict[str, Any]:
    return {
        "name": f"{hcp.first_name} {hcp.last_name}",
        "specialty": hcp.specialty_label,
        "city": hcp.city,
        "preferred_channel": hcp.preferred_channel,
        "kol": hcp.kol,
        "un_liters": hcp.un_liters,
        "vingtiles": hcp.vingtiles,
        "sector": hcp.sector,
    }


def last_interactions_summary(summary: dict[str, Any]) -> str:
    notes = summary.get("notes", [])
    last_visit = summary.get("last_visit")
    parts = []
    if last_visit:
        parts.append(
            f"Dernière visite {last_visit['date']} via {last_visit['channel']} "
            f"(résultat: {last_visit['outcome']})."
        )
    for note in notes:
        parts.append(f"Note {note['date']}: {note['text']}")
    return " ".join(parts) if parts else "Aucune interaction récente enregistrée."
