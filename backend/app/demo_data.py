from __future__ import annotations

from datetime import date, timedelta
from random import Random
from typing import Iterable

from sqlmodel import Session, select

from .models import Competitor, ConversationNote, HCP, Product, Visit

SEED = 42

OUTCOMES = ["Positive", "Neutral", "Needs follow-up", "Pending"]
CHANNELS = ["Face-to-face", "Teams", "Phone", "Email"]


def _daterange(rng: Random, start_days: int, end_days: int) -> date:
    return date.today() - timedelta(days=rng.randint(start_days, end_days))


def generate_visits(hcps: Iterable[HCP], rng: Random) -> list[Visit]:
    visits: list[Visit] = []
    for hcp in hcps:
        count = rng.randint(1, 4)
        for _ in range(count):
            visit_date = _daterange(rng, 5, 180)
            visits.append(
                Visit(
                    hcp_id=hcp.id,
                    date=visit_date,
                    duration_min=rng.choice([20, 30, 45, 60]),
                    outcome=rng.choice(OUTCOMES),
                    next_action_due=visit_date + timedelta(days=rng.choice([14, 30, 60])),
                    channel_used=rng.choice(CHANNELS),
                )
            )
    return visits


def generate_notes(hcps: Iterable[HCP], rng: Random) -> list[ConversationNote]:
    notes: list[ConversationNote] = []
    for hcp in hcps:
        note_date = _daterange(rng, 3, 120)
        competitor_flag = rng.random() < 0.3
        tags = ["BPCO", rng.choice(["Device", "Adherence", "Homecare"])]
        notes.append(
            ConversationNote(
                hcp_id=hcp.id,
                date=note_date,
                note_text="Discussed oxygen therapy adherence and patient onboarding steps.",
                tags_json=str(tags),
                competitor_mentioned_bool=competitor_flag,
            )
        )
    return notes


def generate_products() -> list[Product]:
    return [
        Product(
            name="OxyFlow Portable",
            indications="BPCO patients with ambulatory oxygen needs",
            approved_claims_json='["Continuous flow", "Lightweight design"]',
            do_not_say_json='["Cures BPCO"]',
            spec_json='{"battery": "8h", "weight": "2.4kg"}',
        ),
        Product(
            name="HomeCare Connect",
            indications="Remote monitoring for chronic respiratory patients",
            approved_claims_json='["Remote adherence tracking"]',
            do_not_say_json='["Replaces clinician judgment"]',
            spec_json='{"connectivity": "LTE", "dashboard": "Clinician portal"}',
        ),
    ]


def generate_competitors() -> list[Competitor]:
    return [
        Competitor(
            name="RespiraTech",
            positioning="Premium device portfolio with focus on portability.",
            known_claims_json='["Ultra-light systems"]',
            spec_json='{"warranty": "2y"}',
        ),
        Competitor(
            name="PulmoCare",
            positioning="Value-focused offering for clinics.",
            known_claims_json='["Cost-effective service contracts"]',
            spec_json='{"support": "24/7"}',
        ),
    ]


def seed_demo_data(session: Session) -> None:
    rng = Random(SEED)
    hcps = list(session.exec(select(HCP)))
    if not hcps:
        return
    for visit in generate_visits(hcps, rng):
        session.add(visit)
    for note in generate_notes(hcps, rng):
        session.add(note)
    for product in generate_products():
        session.add(product)
    for competitor in generate_competitors():
        session.add(competitor)
    session.commit()
