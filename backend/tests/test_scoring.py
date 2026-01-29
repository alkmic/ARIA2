from datetime import date, timedelta
from uuid import uuid4

from app.models import ConversationNote, HCP, Visit
from app.scoring import score_hcp


def test_score_hcp_high_potential_overdue() -> None:
    hcp = HCP(
        id=uuid4(),
        last_name="Dupont",
        first_name="Jean",
        specialty_code="PNE",
        specialty_label="Pneumologue",
        preferred_channel="Teams",
        kol=True,
        un_liters=200.0,
        vingtiles=18,
        source_sheet="MG",
    )
    visits = [
        Visit(
            hcp_id=hcp.id,
            date=date.today() - timedelta(days=90),
            duration_min=30,
            outcome="Positive",
            next_action_due=date.today() - timedelta(days=10),
            channel_used="Teams",
        )
    ]
    notes = [
        ConversationNote(
            hcp_id=hcp.id,
            date=date.today() - timedelta(days=20),
            note_text="Mentions competitor",
            tags_json="[]",
            competitor_mentioned_bool=True,
        )
    ]

    explanation = score_hcp(hcp, visits, notes)

    assert explanation.score > 0.5
    assert "High potential" in " ".join(explanation.top_factors)
    assert explanation.component_scores["competitor_signal"] == 1.0
