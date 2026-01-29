from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any

import requests

from .agent_tools import GROQ_BASE_URL, GROQ_MODEL, compliance_guard
from .models import Product


@dataclass
class AnonymizedText:
    original: str
    anonymized: str


def _mask_regex(text: str) -> str:
    patterns = {
        r"\b[\w\.-]+@[\w\.-]+\.\w+\b": "[email]",
        r"\b(?:\+?\d[\d\s\.-]{7,}\d)\b": "[phone]",
        r"\b\d{1,3}\s+\w+\s+(street|st|avenue|ave|road|rd|boulevard|blvd)\b": "[address]",
    }
    masked = text
    for pattern, replacement in patterns.items():
        masked = re.sub(pattern, replacement, masked, flags=re.IGNORECASE)
    return masked


def anonymize_text(text: str) -> AnonymizedText:
    anonymized = text
    try:
        import spacy

        nlp = spacy.load("en_core_web_sm")
        doc = nlp(text)
        for ent in doc.ents:
            if ent.label_ in {"PERSON", "GPE", "LOC", "ORG"}:
                anonymized = anonymized.replace(ent.text, "[redacted]")
    except Exception:
        anonymized = _mask_regex(text)
    return AnonymizedText(original=text, anonymized=anonymized)


def extract_after_visit_report(
    transcript_text: str, groq_key: str | None
) -> dict[str, Any]:
    if not groq_key:
        return {
            "summary_bullets": [
                "Discussion focused on BPCO adherence and homecare coordination.",
                "Mentioned operational constraints and follow-up timing.",
                "Agreed to share onboarding materials.",
            ],
            "pain_points": ["Adherence challenges", "Follow-up cadence"],
            "objections": ["Budget sensitivity"],
            "competitor_mentions": ["RespiraTech"],
            "actions": [
                {"task": "Send onboarding kit", "due_date": "2024-12-15", "owner": "Rep"},
                {"task": "Schedule clinical review", "due_date": "2024-12-30", "owner": "Rep"},
            ],
            "follow_up_channel": "Email",
        }

    system_prompt = (
        "Extract structured fields as JSON with keys summary_bullets (3 strings), "
        "pain_points, objections, competitor_mentions (lists), actions (list of {task,due_date,owner}), "
        "follow_up_channel. No extra text."
    )
    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": transcript_text},
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
        return extract_after_visit_report(transcript_text, None)
    content = response.json()["choices"][0]["message"]["content"]
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return extract_after_visit_report(transcript_text, None)


def compliance_for_report(report: dict[str, Any], product: Product) -> dict[str, Any]:
    combined = " ".join(
        [
            " ".join(report.get("summary_bullets", [])),
            " ".join(report.get("pain_points", [])),
            " ".join(report.get("objections", [])),
        ]
    )
    return compliance_guard(combined, product)
