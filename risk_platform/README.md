# Loan Risk Intelligence Platform

Explainable, API-first loan default risk assessment for banks, MFIs, SACCOs, and government lending programs.

## Virtual environment

From the **repository root**:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -U pip
pip install -r requirements.txt -r risk_platform/requirements-api.txt
```

## ML artifacts

```powershell
# After data/raw + preprocessing (see root README)
python scripts/export_production_model.py --version v1
```

Artifacts: `risk_platform/artifacts/v1/` (`classifier.joblib`, `manifest.json`, …).

## Run locally (development)

**Terminal 1 — Redis**

```powershell
docker run -p 6379:6379 redis:7-alpine
```

**Terminal 2 — API**

```powershell
$env:PYTHONPATH = (Get-Location).Path
cd risk_platform\backend
# Optional: copy risk_platform\.env.example to risk_platform\backend\.env
python -m uvicorn app.main:app --reload --port 8000
```

**Terminal 3 — Celery worker**

```powershell
$env:PYTHONPATH = (Get-Location).Path
cd risk_platform\backend
celery -A app.celery_app worker --loglevel=info
```

For local dev **without Redis**, set `CELERY_TASK_ALWAYS_EAGER=true` in `.env` (runs batch jobs in-process).

**Terminal 4 — Frontend**

```powershell
cd risk_platform\frontend
npm install
npm run dev
```

Open http://localhost:5173 — API docs at http://127.0.0.1:8000/docs

### Seeded users

| Email | Password | Role |
|-------|----------|------|
| admin@localhost | admin123 | admin |
| officer@localhost | officer123 | loan_officer |
| analyst@localhost | analyst123 | risk_analyst |

## Docker Compose (full stack)

```powershell
cd risk_platform\docker
docker compose up --build
```

- Frontend: http://localhost:5173  
- API: http://localhost:8000/docs  

Mount trained artifacts into `risk_platform/artifacts/v1` before scoring.

## Database migrations (Alembic)

```powershell
cd risk_platform\backend
alembic upgrade head
```

The API runs migrations automatically on startup when `USE_ALEMBIC=true` (default).

## API highlights

| Area | Endpoints |
|------|-----------|
| Auth | `POST /api/v1/auth/login`, `GET /api/v1/auth/me` |
| Applications | `POST /api/v1/applications/friendly`, `POST .../friendly/score`, `POST .../{id}/score` |
| Batch | `POST /api/v1/batches` (CSV), `GET /api/v1/batches/{id}/download` |
| Simulation | `POST /api/v1/simulations` |
| Dashboard | `GET /api/v1/dashboard/summary`, `GET /api/v1/dashboard/charts` |
| Policies | `GET/PUT /api/v1/policies` |
| Audit | `GET /api/v1/audit` |

## Living plan

See [docs/loan_risk_intelligence_platform_plan.md](../docs/loan_risk_intelligence_platform_plan.md).
