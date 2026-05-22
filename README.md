# CreditRiskAI — Loan Risk Intelligence Platform
## IndabaX Zimbabwe 2026 Hackathon

> **AI-powered loan default prediction with explainability, multilingual chat, and a full risk management dashboard — built for Zimbabwe's financial inclusion ecosystem.**

**Team:** Spacious_zim ....Panashe(Lead), Shallin and Fadziso  
**Zindi Best AUC:** 0.67680 (LightGBM ensemble, 56 engineered features)  
**Live Demo:** https://zindi-loan-default-hackathon.vercel.app  

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Requirements](#2-system-requirements)
3. [Quick Start — Docker (Recommended)](#3-quick-start--docker-recommended)
4. [Manual Setup — Local Development](#4-manual-setup--local-development)
5. [Default Login Credentials](#5-default-login-credentials)
6. [Project Structure](#6-project-structure)
7. [ML Pipeline — Reproduce Results](#7-ml-pipeline--reproduce-results)
8. [API Reference](#8-api-reference)
9. [Features Overview](#9-features-overview)
10. [Deployment](#10-deployment)

---

## 1. Project Overview

CreditRiskAI is an end-to-end loan default risk intelligence platform that combines:

- **Machine Learning** — LightGBM + CatBoost ensemble trained on the Zindi Zimbabwe loan dataset
- **Explainable AI** — SHAP TreeExplainer on every prediction with human-readable narratives
- **Risk Management Dashboard** — Real-time KPIs, Zimbabwe province choropleth map, trend charts
- **Multilingual Chat Assistant** — AI-powered borrower support in English, ChiShona, and IsiNdebele
- **Batch Scoring** — Upload CSV, get probability-of-default scores for thousands of applicants instantly
- **What-If Simulations** — Loan officers model alternate scenarios before issuing decisions
- **Credit Improvement Recommendations** — Rejected applicants see ranked actions to improve eligibility
- **PDF Report Export** — Download a 2-page credit risk assessment report per applicant
- **PWA / Offline Mode** — Rural loan officers can save drafts without internet

---

## 2. System Requirements

| Tool | Minimum Version | Check |
|------|----------------|-------|
| Python | 3.10+ | `python --version` |
| Node.js | 18+ | `node --version` |
| Docker Desktop | 24+ | `docker --version` |
| Git | any | `git --version` |

> Docker is the easiest path. If you have Docker Desktop installed, skip to Section 3.

---

## 3. Quick Start — Docker (Recommended)

**One command starts the entire stack** (API + Worker + Redis + Frontend):

```bash
# 1. Clone the repository
git clone https://github.com/Gabrielpanashe/zindi-loan-default-hackathon.git
cd zindi-loan-default-hackathon

# 2. (Optional) Add AI chat support
#    Copy the example env file and add your Anthropic API key
cp risk_platform/backend/.env.example risk_platform/backend/.env
# Edit .env and set: ANTHROPIC_API_KEY=sk-ant-...
# (Chat widget still loads without this key; AI responses will be disabled)

# 3. Start everything
cd risk_platform/docker
docker compose up --build
```

Wait ~60 seconds for all services to become healthy, then open:

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:5173 |
| **API docs** | http://localhost:8000/docs |
| **Health check** | http://localhost:8000/api/v1/healthz |

To stop: `docker compose down`  
To stop and wipe data: `docker compose down -v`

---

## 4. Manual Setup — Local Development

Use this path if you want hot-reload during development or don't have Docker.

### Step 1 — Python environment

```bash
# From the repository root
python -m venv .venv

# Windows (PowerShell)
.\.venv\Scripts\Activate.ps1

# macOS / Linux
source .venv/bin/activate

pip install -U pip
pip install -r requirements.txt
pip install -r risk_platform/requirements-api.txt
```

### Step 2 — Environment variables

```bash
# Copy the example file
cp risk_platform/backend/.env.example risk_platform/backend/.env
```

The defaults work for local dev. Key variables in `.env`:

```env
DATABASE_URL=sqlite:///./data/platform.db
JWT_SECRET=dev-secret-change-in-prod
CELERY_TASK_ALWAYS_EAGER=true      # runs batch jobs in-process (no Redis needed)
ANTHROPIC_API_KEY=                 # optional — enables AI chat
```

### Step 3 — Frontend dependencies

```bash
cd risk_platform/frontend
npm install
cd ../..
```

### Step 4 — Run the services

Open **4 terminals** from the repository root:

**Terminal 1 — API server**
```bash
# Windows
$env:PYTHONPATH = (Get-Location).Path
cd risk_platform\backend
python -m uvicorn app.main:app --reload --port 8000

# macOS / Linux
PYTHONPATH=$(pwd) uvicorn app.main:app --reload --port 8000 --app-dir risk_platform/backend
```

**Terminal 2 — Frontend**
```bash
cd risk_platform/frontend
npm run dev
```

**Terminal 3 — (Optional) Celery worker + Redis**  
Skip if `CELERY_TASK_ALWAYS_EAGER=true` (the default for local dev).
```bash
# Start Redis first (requires Docker or a local Redis install)
docker run -p 6379:6379 redis:7-alpine

# Then in a new terminal:
$env:PYTHONPATH = (Get-Location).Path
cd risk_platform\backend
celery -A app.celery_app worker --loglevel=info
```

Open http://localhost:5173 — API docs at http://localhost:8000/docs

---

## 5. Default Login Credentials

Four roles are seeded automatically on first startup:

| Email | Password | Role | Access |
|-------|----------|------|--------|
| admin@localhost | admin123 | **Admin** | All features + policy management |
| officer@localhost | officer123 | **Loan Officer** | Applications, batch upload, simulations |
| analyst@localhost | analyst123 | **Risk Analyst** | Dashboard, audit log, read-only |
| applicant@localhost | applicant123 | **Applicant** | Personal portal, chat assistant |

---

## 6. Project Structure

```
zindi-loan-default-hackathon/
│
├── data/
│   ├── raw/                    ← Train.csv, Test.csv (place here for ML training)
│   └── processed/              ← Generated parquet files
│
├── notebooks/                  ← Jupyter EDA + modelling notebooks (01–07)
│
├── src/                        ← Shared Python ML modules
│   ├── config.py               ← Column definitions, constants
│   ├── preprocessing.py        ← Feature engineering pipeline
│   ├── train.py                ← Model training entry point
│   └── submit.py               ← Zindi submission generator
│
├── risk_platform/
│   ├── artifacts/v1/           ← Exported ML artifacts (classifier.joblib, manifest.json…)
│   ├── ml_runtime/
│   │   └── inference.py        ← InferenceEngine: transform → predict → SHAP explain
│   ├── backend/
│   │   ├── app/
│   │   │   ├── api/routes/     ← FastAPI routers (auth, applications, batch, chat…)
│   │   │   ├── models/         ← SQLAlchemy ORM models
│   │   │   ├── services/       ← Scoring, decision logic, ML engine singleton
│   │   │   └── tasks/          ← Celery async tasks (batch processing)
│   │   └── .env.example        ← Environment variable template
│   ├── frontend/
│   │   └── src/
│   │       ├── pages/          ← Dashboard, Apply, Batch, Simulate, Audit, Portal…
│   │       ├── components/     ← ChatWidget, ZimbabweMap, CreditImprovement, LoanReport…
│   │       └── api.ts          ← Typed API client
│   └── docker/
│       ├── docker-compose.yml  ← Full stack orchestration
│       ├── Dockerfile.api      ← Python API + worker image
│       └── Dockerfile.frontend ← Nginx + built React SPA
│
├── scripts/
│   └── export_production_model.py  ← Exports trained model to risk_platform/artifacts/v1
│
├── submissions/                ← Zindi submission CSV files
└── tests/                      ← Submission format validation
```

---

## 7. ML Pipeline — Reproduce Results

> Skip this section if you just want to run the platform — ML artifacts are already committed at `risk_platform/artifacts/v1/`.

### Prerequisites

Place the Zindi data files in `data/raw/`:
- `Train.csv`
- `Test.csv`
- `SampleSubmission.csv`

### Run the pipeline

```bash
# Activate virtual environment first (Section 4, Step 1)

# 1. Build processed features (IterativeImputer, TargetEncoder, 56 feature columns)
python -c "from src.preprocessing import fit_transform_save; fit_transform_save()"

# 2. Train LightGBM with 5-fold stratified CV
python src/train.py

# 3. Export model artifacts for the API
python scripts/export_production_model.py --version v1

# 4. Generate Zindi submission
python src/submit.py submissions/my_submission.csv

# 5. Validate submission format
python tests/test_submission_format.py submissions/my_submission.csv
```

**Best result:** AUC 0.67680 (LightGBM + CatBoost ensemble, V10 submission)

---

## 8. API Reference

Full interactive docs: http://localhost:8000/docs

| Category | Method | Endpoint | Description |
|----------|--------|----------|-------------|
| Auth | POST | `/api/v1/auth/login` | Get JWT token |
| Auth | GET | `/api/v1/auth/me` | Current user |
| Applications | POST | `/api/v1/applications/friendly` | Create application |
| Applications | POST | `/api/v1/applications/friendly/score` | Score + SHAP explain |
| Batch | POST | `/api/v1/batches` | Upload CSV for bulk scoring |
| Batch | GET | `/api/v1/batches/{id}/download` | Download scored results |
| Simulation | POST | `/api/v1/simulations` | What-if scenario |
| Dashboard | GET | `/api/v1/dashboard/summary` | KPIs |
| Dashboard | GET | `/api/v1/dashboard/charts` | Chart data |
| Policies | GET/PUT | `/api/v1/policies` | Approve/review thresholds |
| Audit | GET | `/api/v1/audit` | Audit log |
| Chat | POST | `/api/v1/chat` | AI assistant (EN/SN/ND) |
| Health | GET | `/api/v1/healthz` | Service health |

**Authentication:** All endpoints except `/auth/login` require `Authorization: Bearer <token>`.

---

## 9. Features Overview

### Batch CSV Scoring
Upload any CSV matching the Zindi training schema. The system scores all rows in one vectorized pass and returns a results CSV with `probability_default`, `recommendation` (approve/manual_review/reject), and `risk_tier` (low/medium/high) per row.

**Sample CSV format** — columns match `Train.csv` from the Zindi dataset (ID, age, gender, loan_amount, income, province, sector, term_months, existing_obligations, employment_type…).

### AI Chat Assistant
Available in English, ChiShona (SN), and IsiNdebele (ND). Powered by Claude Haiku. The assistant receives the applicant's actual PD score and SHAP risk drivers as context, so answers are specific to their assessment.

Requires `ANTHROPIC_API_KEY` in `.env`.

### What-If Simulation
Loan officers adjust any input parameter (loan amount, income, term, obligations) and instantly see the new PD and recommendation — without creating a formal application record.

### PDF Report Export
From the loan result screen, click "Export PDF Report" to download a 2-page PDF containing applicant details, AI decision, top SHAP risk drivers, and a model transparency disclaimer.

### PWA / Offline Mode
Install as a standalone app from Chrome. Application drafts are saved to `localStorage` so rural officers can fill forms offline and submit when connectivity is restored.

---

## 10. Deployment

### Frontend — Vercel (Live)
```
https://zindi-loan-default-hackathon.vercel.app
```
Set environment variable `VITE_API_URL` to your backend URL in the Vercel project settings.

### Backend — Railway / Render
Set these environment variables on your hosting provider:

```env
DATABASE_URL=sqlite:///./data/platform.db
JWT_SECRET=<strong-random-secret>
CORS_ORIGINS=https://your-frontend.vercel.app
ANTHROPIC_API_KEY=<your-key>
USE_ALEMBIC=true
CELERY_TASK_ALWAYS_EAGER=true   # use if no Redis available on free tier
```

Start command:
```bash
sh -c 'cd risk_platform/backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT'
```

---

## Submission Log

| Version | Local AUC | Zindi Public AUC | Date | Notes |
|---------|-----------|-----------------|------|-------|
| V1 | 0.6451 | — | May 10 | Baseline logistic regression |
| V10 | 0.6780 | 0.67680 | May 19 | LightGBM + CatBoost ensemble, 56 features |

---

*Built for IndabaX Zimbabwe 2026 — advancing AI for financial inclusion in Zimbabwe.*
