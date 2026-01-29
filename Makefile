setup:
	python -m pip install -r backend/requirements.txt
	cd frontend && npm install

resetdb:
	rm -f backend/app/aria.db

backend:
	cd backend && uvicorn app.main:app --reload --port 8000

frontend:
	cd frontend && npm run dev

dev:
	$(MAKE) -j2 backend frontend
