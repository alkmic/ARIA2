from __future__ import annotations

from pathlib import Path
from typing import Iterable

import pandas as pd
from sqlmodel import Session

from .models import HCP

SHEETS = {
    "Scoring MG ": "MG",
    "Scoring Pneu": "PNEU",
}


def _to_bool(value: object) -> bool:
    if isinstance(value, str):
        return value.strip().lower() in {"oui", "yes", "true", "1"}
    if isinstance(value, (int, float)):
        return bool(value)
    return False


def _to_float(value: object) -> float:
    try:
        if pd.isna(value):
            return 0.0
    except TypeError:
        pass
    try:
        return float(str(value).replace(",", "."))
    except (TypeError, ValueError):
        return 0.0


def _to_int(value: object) -> int:
    try:
        if pd.isna(value):
            return 0
    except TypeError:
        pass
    try:
        return int(float(str(value).replace(",", ".")))
    except (TypeError, ValueError):
        return 0


def _normalize_frame(frame: pd.DataFrame, source_sheet: str) -> Iterable[HCP]:
    for _, row in frame.iterrows():
        yield HCP(
            last_name=str(row.get("Nom", "")).strip(),
            first_name=str(row.get("Prénom", "")).strip(),
            specialty_code=str(row.get("specialite_code", "")).strip() or None,
            specialty_label=str(row.get("specialite_libelle", "")).strip() or None,
            phone=str(row.get("Telephone", "")).strip() or None,
            address=str(row.get("Adresse", "")).strip() or None,
            postal_code=str(row.get("Code Postal", "")).strip() or None,
            city=str(row.get("VILLEREVERSURE", "")).strip() or None,
            sector=str(row.get("Secteur Conventionnel", "")).strip() or None,
            activity=str(row.get("Activité", "")).strip() or None,
            preferred_channel=str(row.get("Canal privilégié", "")).strip() or None,
            kol=_to_bool(row.get("KOL")),
            un_liters=_to_float(row.get("UN (en Litre)")),
            vingtiles=_to_int(row.get("Vingtiles")),
            source_sheet=source_sheet,
        )


def ingest_excel(path: Path, session: Session) -> int:
    total = 0
    for sheet_name, source_sheet in SHEETS.items():
        frame = pd.read_excel(path, sheet_name=sheet_name)
        for hcp in _normalize_frame(frame, source_sheet):
            if not hcp.last_name and not hcp.first_name:
                continue
            session.add(hcp)
            total += 1
    session.commit()
    return total
