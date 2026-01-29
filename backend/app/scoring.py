from __future__ import annotations

from datetime import date, datetime
from typing import Iterable

from .models import ConversationNote, HCP, ScoreExplanation, Visit

WEIGHTS = {
    "potential": 0.35,
    "recency": 0.2,
    "channel_fit": 0.15,
    "kol_boost": 0.1,
    "competitor_signal": 0.1,
    "overdue_actions": 0.1,
}


def _normalize(value: float, max_value: float) -> float:
    if max_value <= 0:
        return 0.0
    return min(value / max_value, 1.0)


def _days_since(last_date: date | None) -> int:
    if last_date is None:
        return 365
    return max((date.today() - last_date).days, 0)


def score_hcp(
    hcp: HCP, visits: Iterable[Visit], notes: Iterable[ConversationNote]
) -> ScoreExplanation:
    visits_list = sorted(visits, key=lambda v: v.date)
    notes_list = sorted(notes, key=lambda n: n.date)

    last_visit_date = visits_list[-1].date if visits_list else None
    last_note_date = notes_list[-1].date if notes_list else None

    days_since_visit = _days_since(last_visit_date)
    overdue_actions = 0.0
    if visits_list:
        overdue_actions = sum(
            1
            for visit in visits_list
            if visit.next_action_due and visit.next_action_due < date.today()
        )
    overdue_component = _normalize(float(overdue_actions), 3.0)

    potential_raw = hcp.un_liters + (hcp.vingtiles * 10.0)
    potential_component = _normalize(potential_raw, 500.0)

    recency_component = _normalize(float(days_since_visit), 180.0)
    if days_since_visit > 60:
        recency_component = min(recency_component + 0.2, 1.0)

    preferred = (hcp.preferred_channel or "").lower()
    last_channel = visits_list[-1].channel_used.lower() if visits_list else ""
    channel_fit_component = 1.0 if preferred and preferred in last_channel else 0.4

    kol_component = 1.0 if hcp.kol else 0.0

    competitor_component = 0.0
    if notes_list:
        recent_note = notes_list[-1]
        days_since_note = _days_since(last_note_date)
        if recent_note.competitor_mentioned_bool and days_since_note <= 90:
            competitor_component = 1.0

    component_scores = {
        "potential": potential_component,
        "recency": recency_component,
        "channel_fit": channel_fit_component,
        "kol_boost": kol_component,
        "competitor_signal": competitor_component,
        "overdue_actions": overdue_component,
    }

    score = sum(component_scores[key] * WEIGHTS[key] for key in component_scores)

    top_factors: list[str] = []
    if hcp.vingtiles >= 15:
        top_factors.append(f"High potential (Vingtiles {hcp.vingtiles})")
    if days_since_visit > 60:
        top_factors.append(f"No visit in {days_since_visit} days")
    if competitor_component > 0:
        top_factors.append("Competitor mentioned recently")
    if overdue_component > 0:
        top_factors.append("Action overdue")
    if hcp.kol:
        top_factors.append("KOL priority")

    if not top_factors:
        top_factors.append("Stable relationship - maintain cadence")

    return ScoreExplanation(
        hcp_id=hcp.id,
        score=round(score, 3),
        top_factors=top_factors[:3],
        component_scores={k: round(v, 3) for k, v in component_scores.items()},
        generated_at=datetime.utcnow(),
    )
