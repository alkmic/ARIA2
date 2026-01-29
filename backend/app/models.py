from __future__ import annotations

from datetime import date, datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class HCP(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    last_name: str
    first_name: str
    specialty_code: Optional[str] = None
    specialty_label: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    postal_code: Optional[str] = None
    city: Optional[str] = None
    sector: Optional[str] = None
    activity: Optional[str] = None
    preferred_channel: Optional[str] = None
    kol: bool = False
    un_liters: float = 0.0
    vingtiles: int = 0
    source_sheet: str


class Visit(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    hcp_id: UUID = Field(foreign_key="hcp.id")
    date: date
    duration_min: int
    outcome: str
    next_action_due: Optional[date] = None
    channel_used: str


class ConversationNote(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    hcp_id: UUID = Field(foreign_key="hcp.id")
    date: date
    note_text: str
    tags_json: str
    competitor_mentioned_bool: bool = False


class Product(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str
    indications: str
    approved_claims_json: str
    do_not_say_json: str
    spec_json: str


class Competitor(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str
    positioning: str
    known_claims_json: str
    spec_json: str


class ScoreExplanation(SQLModel):
    hcp_id: UUID
    score: float
    top_factors: list[str]
    component_scores: dict[str, float]
    generated_at: datetime
