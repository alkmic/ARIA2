from __future__ import annotations

import json
from typing import Any

import requests
import sqlglot
from sqlglot import exp

from .agent_tools import GROQ_BASE_URL, GROQ_MODEL

ALLOWED_TABLES = {
    "hcp": {
        "id",
        "last_name",
        "first_name",
        "specialty_code",
        "specialty_label",
        "phone",
        "address",
        "postal_code",
        "city",
        "sector",
        "activity",
        "preferred_channel",
        "kol",
        "un_liters",
        "vingtiles",
        "source_sheet",
    },
    "visit": {"id", "hcp_id", "date", "duration_min", "outcome", "next_action_due", "channel_used"},
    "conversationnote": {
        "id",
        "hcp_id",
        "date",
        "note_text",
        "tags_json",
        "competitor_mentioned_bool",
    },
}


def generate_sql(question: str, groq_key: str | None) -> dict[str, str]:
    if not groq_key:
        return {
            "sql": "SELECT specialty_label, COUNT(*) AS count FROM hcp GROUP BY specialty_label",
            "rationale_short": "Fallback: count HCPs by specialty.",
            "chart_hint": "bar",
        }
    system_prompt = (
        "Return JSON with keys sql, rationale_short, chart_hint. "
        "Only use tables: hcp, visit, conversationnote. Only SELECT queries."
    )
    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question},
        ],
        "temperature": 0.2,
    }
    response = requests.post(
        GROQ_BASE_URL,
        headers={"Authorization": f"Bearer {groq_key}"},
        json=payload,
        timeout=20,
    )
    if response.status_code != 200:
        return generate_sql(question, None)
    content = response.json()["choices"][0]["message"]["content"]
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return generate_sql(question, None)


def validate_sql(sql: str) -> str:
    parsed = sqlglot.parse_one(sql, read="sqlite")
    if not isinstance(parsed, exp.Select):
        raise ValueError("Only SELECT statements are allowed.")
    for node in parsed.walk():
        if isinstance(node, exp.Command):
            raise ValueError("Commands are not allowed.")
        if isinstance(node, exp.Table):
            table = node.name.lower()
            if table not in ALLOWED_TABLES:
                raise ValueError(f"Table not allowed: {table}")
        if isinstance(node, exp.Column):
            if node.table:
                table = node.table.lower()
                if table not in ALLOWED_TABLES:
                    raise ValueError(f"Table not allowed: {table}")
                if node.name not in ALLOWED_TABLES[table]:
                    raise ValueError(f"Column not allowed: {table}.{node.name}")
    if parsed.args.get("limit") is None:
        parsed.set("limit", exp.Limit(this=exp.Literal.number(50)))
    return parsed.sql(dialect="sqlite")
