# Loan Risk Intelligence Platform — Living Plan

**Project:** AI for Financial Inclusion — Loan Default Prediction  
**Competition:** IndabaX Zimbabwe 2026 (Zindi)  
**Phase 1:** ML model (deadline May 15) — COMPLETE, best Zindi AUC = 0.67680 (V10)  
**Phase 2:** Production platform (deadline May 22) — see checklist below  
**Canonical source of truth:** this file. Update whenever anything changes.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  React SPA (Vite + TypeScript)  ← risk_platform/frontend/  │
│  Pages: Login | Dashboard | Apply | Batch |                 │
│         Simulate | Policies | Audit                         │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/JSON
┌────────────────────────▼────────────────────────────────────┐
│  FastAPI  (risk_platform/backend/)                          │
│  Routes: auth | applications | dashboard | batch |          │
│          policies | simulations | audit | health            │
│  JWT RBAC: admin | loan_officer | risk_analyst              │
└──────┬──────────┬────────────────┬───────────────────────────┘
       │          │                │
  SQLite/      Redis           InferenceEngine
  PostgreSQL   (Celery          (ml_runtime/inference.py)
  (SQLAlchemy)  broker)          ├── classifier.joblib
                │                ├── SHAP TreeExplainer
         Celery workers          ├── numeric_medians.pkl
         (batch scoring)         └── label_encoders.pkl
```

---

## Repository Layout

| Path | Purpose | Status |
|------|---------|--------|
| `src/` | ML pipeline: data loading, features, training, evaluation | ✅ Complete |
| `risk_platform/backend/` | FastAPI: all routes, DB models, auth, tasks | ✅ Complete |
| `risk_platform/ml_runtime/` | InferenceEngine + SHAP narratives | ✅ Complete |
| `risk_platform/frontend/` | React SPA (7 pages, recharts, auth) | ✅ Complete |
| `risk_platform/docker/` | docker-compose.yml for full stack | ✅ Complete |
| `risk_platform/artifacts/v1/` | Exported model + encoders — **gitignored, must generate** | ❌ Needs export |
| `scripts/export_production_model.py` | Trains LightGBM, saves artifacts | ✅ Complete |
| `docs/` | This plan + architecture notes | ✅ Up to date |
| `tests/` | Submission format validator + decision engine tests | ✅ Complete |

---

## Functional Capabilities (All Implemented)

### 1. Risk Scoring
- Borrower submits loan application via friendly form
- System computes probability of default (PD) using CatBoost model
- Returns: PD score, risk tier (Low / Medium / High), recommendation (Approve / Manual Review / Reject)
- Configurable thresholds per institution

### 2. Explainable AI (SHAP)
- SHAP TreeExplainer runs on every prediction
- Top 8 feature contributions returned with direction (increases_risk / decreases_risk)
- Human-readable narratives: "Low monthly income pushed the default estimate higher"
- ShapChart component renders horizontal bar chart in UI

### 3. Decision Policy Engine
- Institutions configure their own approve/review/reject thresholds via Policies page
- Policy snapshot stored with every decision for audit trail
- Default thresholds: Approve ≤ 0.30, Manual Review 0.31–0.60, Reject > 0.60

### 4. Portfolio Dashboard
- KPI cards: Total applications, Predictions, Approval rate, Average PD
- Risk tier distribution pie chart
- PD histogram bar chart
- Monthly application trend line chart
- All charts API-backed, real data from database

### 5. Borrower Segmentation
- Applicant segments: Farmers, SMEs, Civil_Servants, Informal_Traders, Government_Employees
- Segment breakdown shown in dashboard
- Supports targeted inclusion analytics

### 6. What-If Simulation
- Loan officer adjusts any input field
- System rescores and returns new PD, risk tier, recommendation
- Shows change in default probability vs original

### 7. Audit & Traceability
- Every prediction, decision, policy change, batch job logged to AuditLog table
- Records: actor, action, entity, timestamp, detail JSON
- Audit viewer page with paginated history
- Model version tracked in every prediction

### 8. Batch Loan Scoring
- Upload CSV of multiple applicants
- Celery processes asynchronously (Redis broker)
- Download scored results CSV
- Batch summary (total, approved, review, rejected)

### 9. Security / Auth
- JWT tokens, 30-min expiry
- 3 roles: Admin, Loan Officer, Risk Analyst
- All routes protected except /login and /health
- Bootstrap seeds 3 demo users on first startup

### 10. Database Persistence
- SQLAlchemy ORM with 8 tables
- Alembic migration: runs automatically on startup (USE_ALEMBIC=true)
- Works with SQLite (dev) or PostgreSQL (prod)

### 11. Scalability Architecture
- Celery + Redis for async batch processing
- Stateless FastAPI API (can be horizontally scaled)
- Docker Compose: API + Celery worker + Redis + PostgreSQL + Frontend

### 12. Docker Deployment
- Single command: `docker compose up --build`
- Frontend served via Nginx on port 5173
- API on port 8000 with OpenAPI docs at /docs

---

## Seeded Demo Users

| Email | Password | Role |
|-------|----------|------|
| admin@localhost | admin123 | admin |
| officer@localhost | officer123 | loan_officer |
| analyst@localhost | analyst123 | risk_analyst |

---

## What Remains (Ordered by Priority)

### CRITICAL — Must Do Before Demo

#### 1. Export the ML model to production artifacts
```powershell
# From repo root with .venv activated:
python scripts/export_production_model.py --version v1
```
This creates `risk_platform/artifacts/v1/`:
- `classifier.joblib` — trained LightGBM
- `manifest.json` — feature columns, git SHA, timestamp
- `numeric_medians.pkl` — for imputation
- `label_encoders.pkl` — for string→int encoding

**Without this, the API starts but /score endpoints return 500.**

#### 2. Verify the API starts
```powershell
$env:PYTHONPATH = (Get-Location).Path
cd risk_platform/backend
python -m uvicorn app.main:app --reload --port 8000
```
Check: http://127.0.0.1:8000/docs — should show all routes
Check: http://127.0.0.1:8000/api/v1/health

#### 3. Verify the frontend builds and connects
```powershell
cd risk_platform/frontend
npm install
npm run dev
```
Check: http://localhost:5173 — Login page should appear
Login as officer@localhost / officer123

#### 4. Test the full scoring flow end-to-end
1. POST /api/v1/auth/login → get token
2. POST /api/v1/applications/friendly/score → submit loan → get PD + SHAP
3. GET /api/v1/dashboard/summary → verify KPIs populate
4. Upload a small test CSV to /api/v1/batches → verify batch scoring

---

### HIGH PRIORITY — Improves Demo Quality

#### 5. Add a "Score Result" page to the frontend
Currently Apply.tsx submits and probably just shows raw JSON. Build a proper result card:
- Large PD percentage gauge
- Risk tier badge (green/amber/red)
- Recommendation (Approve / Manual Review / Reject)
- SHAP bar chart (ShapChart component exists)
- Narrative bullets

#### 6. Polish the Apply form
The Apply.tsx form should cover all the competition's required fields:
- Income, loan amount, employment status, business type
- Farming activity, repayment history, loan duration
- Province, collateral type, product type

#### 7. Add a Zimbabwe-specific context to the UI
- Province selector with flag/map reference
- Employment sector options specific to Zimbabwe
- Currency labeled as USD (Zimbabwe uses USD)
- Mention IndabaX Zimbabwe branding

---

### MEDIUM PRIORITY — For Judges / Presentation

#### 8. Create a demo walkthrough script
Step-by-step guide showing:
1. A farmer in Mashonaland applies for $500 agriculture loan
2. System scores as Medium Risk, recommends Manual Review
3. SHAP shows: "Informal income source increased risk"
4. Loan officer uses simulation: increase income by $200 → risk drops to Low

#### 9. Add a "What-If" result comparison to Simulate page
Show side-by-side: Original PD vs New PD after changes

#### 10. Connect Batch page to show progress
While Celery processes, show a status indicator that polls GET /batches/{id}

---

### OPTIONAL — If Time Permits

#### 11. PostgreSQL for production (currently SQLite)
Set `DATABASE_URL=postgresql://...` in .env

#### 12. Expand test coverage
- Integration test: raw payload → API score → verify SHAP returned
- Test batch job processing end-to-end

#### 13. Improve SHAP narratives
Map technical feature names to business language:
- `informal_sector_flag` → "Informal employment status"
- `debt_to_income` → "Monthly debt burden vs income"
- `collateral_type_missing` → "No collateral recorded"

---

## Quick-Start Checklist (Run This Order)

```
[ ] python run_preprocessing.py                        # builds data/processed/
[ ] python scripts/export_production_model.py --version v1  # builds artifacts/v1/
[ ] cd risk_platform/backend && python -m uvicorn app.main:app --reload --port 8000
[ ] Open http://127.0.0.1:8000/docs → verify all routes
[ ] cd risk_platform/frontend && npm install && npm run dev
[ ] Open http://localhost:5173 → login → apply → score → check SHAP
[ ] docker compose up --build  (from risk_platform/docker/ for full stack)
```

---

## ML Model Summary (Phase 1 Results)

| Metric | Value |
|--------|-------|
| Algorithm | CatBoost (native categoricals) |
| Best Zindi Public AUC | 0.67680 (V10 — 7-seed ensemble) |
| Local OOF AUC | 0.68841 (V12 — 14-seed depth=4) |
| Features | 56 engineered features |
| Training data | 38,932 loans |
| Class balance | 75.9% no-default, 24.1% default |
| Key predictors | employment_sector, monthly_income_usd, debt_to_income, annual_rate_pct |

---

## Business Value Proposition

**Target institutions:** Commercial banks, MFIs, SACCOs, agricultural lenders, SME financing, government programs

**Value delivered:**
- Reduces manual loan assessment time from days to seconds
- Standardises risk decisions across loan officers
- SHAP explanations satisfy regulatory transparency requirements
- Audit trail enables compliance reporting
- Batch scoring handles portfolio-scale credit reviews
- Simulation helps officers advise borderline applicants on how to improve eligibility

---

## Changelog

| Date | Change |
|------|--------|
| 2026-05-18 | Initial plan file created |
| 2026-05-18 | Backend, ML runtime, Celery, Alembic, React frontend, Docker Compose all implemented |
| 2026-05-12 | Phase 1 ML model completed — CatBoost, OOF AUC 0.688, Zindi 0.677 |
| 2026-05-19 | Full status audit — platform ~95% complete, main blocker is artifact export |
