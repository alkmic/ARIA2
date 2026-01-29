from pathlib import Path

import pandas as pd
from sqlmodel import Session, SQLModel, create_engine

from app.ingest import ingest_excel
from app.models import HCP


def test_ingest_excel(tmp_path: Path) -> None:
    mg = pd.DataFrame(
        {
            "Nom": ["Durand"],
            "Prénom": ["Alice"],
            "specialite_code": ["PNE"],
            "specialite_libelle": ["Pneumologue"],
            "Telephone": ["0102030405"],
            "Adresse": ["10 rue des Lilas"],
            "Code Postal": ["69000"],
            "VILLEREVERSURE": ["Lyon"],
            "Secteur Conventionnel": ["Public"],
            "Activité": ["BPCO"],
            "Canal privilégié": ["Teams"],
            "KOL": ["Oui"],
            "UN (en Litre)": [120.0],
            "Vingtiles": [18],
        }
    )
    pneu = pd.DataFrame(
        {
            "Nom": ["Martin"],
            "Prénom": ["Lucas"],
            "specialite_code": ["GEN"],
            "specialite_libelle": ["Généraliste"],
            "Telephone": ["0607080910"],
            "Adresse": ["5 avenue Victor"],
            "Code Postal": ["75000"],
            "VILLEREVERSURE": ["Paris"],
            "Secteur Conventionnel": ["Privé"],
            "Activité": ["BPCO"],
            "Canal privilégié": ["Phone"],
            "KOL": [0],
            "UN (en Litre)": [80.0],
            "Vingtiles": [12],
        }
    )
    excel_path = tmp_path / "test.xlsx"
    with pd.ExcelWriter(excel_path) as writer:
        mg.to_excel(writer, sheet_name="Scoring MG ", index=False)
        pneu.to_excel(writer, sheet_name="Scoring Pneu", index=False)

    engine = create_engine("sqlite://")
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        count = ingest_excel(excel_path, session)
        results = session.query(HCP).all()

    assert count == 2
    assert len(results) == 2
    assert results[0].source_sheet in {"MG", "PNEU"}
