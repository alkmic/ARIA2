# ARIA — Air Liquide Intelligent Assistant

Production-ready demo for Air Liquide Santé sales reps focused on BPCO prioritization.

## Quickstart

```bash
make setup
make dev
```

Backend runs on `http://localhost:8000` and frontend on `http://localhost:3000`.

### Initialize the database

```bash
curl -X POST "http://localhost:8000/api/init-db"
```

This ingests `/mnt/data/Scoring_Factice_BPCO.xlsx` and seeds demo visits, notes, products, and competitors.

### Reset the database

```bash
make resetdb
```

## Notes

- The backend loads `.env` with `python-dotenv` and expects `GROQ_API_KEY` there (not yet used).
- The frontend is offline-first and does **not** expose backend secrets.

## API Overview

- `GET /api/hcps`
- `GET /api/hcps/{id}`
- `GET /api/hcps/{id}/timeline`
- `GET /api/recommendations/today`
- `POST /api/pitches`
