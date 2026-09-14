# Heri Health controlled-pilot runbook

## Run it

Terminal 1:

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
```

Terminal 2:

```bash
cd frontend
npm run dev
```

Open `http://localhost:3000`.

## Intake workflow

1. A patient describes symptoms in their own words.
2. Deterministic screening checks configured emergency patterns before further
   questions are asked.
3. Non-emergency cases receive focused clarifying questions.
4. The patient reviews an understandable summary and can review/export a
   clinician-facing brief.

## Before a controlled pilot session

- Run `cd backend && .venv/bin/python -m pytest -q`.
- Run `cd frontend && npm run build`.
- Do not process identifiable patient health information until the release gate
  and applicable legal, security, and clinical approvals are complete.
- Confirm the backend is reachable before a session begins.
