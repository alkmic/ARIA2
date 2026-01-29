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
- The frontend is offline-first with a basic service worker and does **not** expose backend secrets.
- Demo pages: `/today`, `/hcp/[id]`, `/visit`, `/after-visit`, `/insights`.

## Publier sur GitHub

```bash
git remote add origin <URL_DU_REPO_GITHUB>
git push -u origin HEAD
```

Ouvrez ensuite une Pull Request sur GitHub pour fusionner dans la branche principale, ou poussez directement sur `main` si c’est votre workflow.

## API Overview

- `GET /api/hcps`
- `GET /api/hcps/{id}`
- `GET /api/hcps/{id}/timeline`
- `GET /api/products`
- `GET /api/recommendations/today`
- `POST /api/pitches`
- `POST /api/prebrief`
- `POST /api/pitch`
- `POST /api/transcribe`
- `POST /api/after_visit_report`
- `POST /api/crm/push`
- `POST /api/nl2sql`
- `GET /api/insights`

## Déploiement gratuit (Vercel + Render)

### 1) Backend FastAPI sur Render (gratuit)
1. Allez sur https://render.com/ et cliquez **New → Web Service**.
2. Connectez votre repo GitHub et sélectionnez ce dépôt.
3. Choisissez **Root Directory**: `backend`.
4. Configurez :
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Variables d’environnement :
   - `GROQ_API_KEY` (optionnel)
6. Déployez. L’URL Render sera du type `https://aria-backend.onrender.com`.

> Remarque : Render gratuit n’a pas de disque persistant. Pour un vrai usage, prévoir une DB externe. Pour une démo, un `POST /api/init-db` suffit.

### 2) Frontend Next.js sur Vercel (gratuit)
1. Allez sur https://vercel.com/ et cliquez **New Project**.
2. Importez ce repo et définissez **Root Directory**: `frontend`.
3. Ajoutez la variable d’environnement :
   - `NEXT_PUBLIC_API_BASE=https://aria-backend.onrender.com`
4. Déployez.

### 3) Initialiser la base en ligne
Une fois le backend en ligne, exécutez :

```bash
curl -X POST "https://aria-backend.onrender.com/api/init-db"
```
