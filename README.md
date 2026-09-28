# SmartFin AI
## AI-Powered Personal Finance Management and Expense Prediction System

SmartFin AI is a university Final Year Project. Users sign in, record income and expenses, set budgets and savings goals, then use those live totals for a health score, ML forecasts, anomaly flags, reports, and a rules-based assistant (optional local Ollama).

---

## Architecture

```
Browser (Next.js :3000)
  → Express API (:5000)  JWT + MongoDB
       → FastAPI ML (:8000)  train / predict / anomalies
       → Ollama (:11434)     optional, assistant only
```

The frontend calls same-origin `/api/*`. Next.js rewrites those to Express (`NEXT_PUBLIC_BACKEND_URL`, default `http://localhost:5000`).

---

## Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Recharts
- **Backend**: Node.js, Express, TypeScript, JWT, bcrypt, Mongoose, Zod
- **Database**: MongoDB (local or Atlas)
- **ML service**: Python 3.11, FastAPI, scikit-learn, XGBoost (optional), Isolation Forest
- **Assistant**: live totals via rules; Ollama only if it actually responds

---

## Repository layout

```
frontend/                 Next.js UI (app/, components/, services/)
backend/                  Express API
  src/config/             env + Mongo connection
  src/middleware/         auth helpers, validation, rate limit, audit, errors
  src/modules/            feature modules (model / routes / service / controller)
  src/__tests__/          Vitest + Supertest (auth, income, expenses)
  server.ts
ml-service/               FastAPI
  app/routes/             /health /train /predict /anomalies
  app/services/           features, forecast, anomaly, registry
  trained_models/         per-user .pkl files (gitignored)
docs/                     API and collection notes that match this repo
```

---

## MongoDB collections (what exists today)

| Collection     | Purpose                                      |
|----------------|----------------------------------------------|
| `users`        | Accounts, profile extras, role USER / ADMIN  |
| `incomes`      | Income rows                                  |
| `expenses`     | Expense rows                                 |
| `budgets`      | Monthly budgets (overall or by category)     |
| `savingsgoals` | Savings goals                                |
| `predictions`  | Stored next-month forecasts                  |
| `anomalies`    | Flagged expenses from Isolation Forest       |
| `notifications`| Budget overrun and unresolved anomaly alerts |
| `auditlogs`    | Successful POST/PATCH/DELETE mutations       |

---

## Run locally

Copy `backend/.env.example` → `backend/.env` and set `MONGODB_URI` plus a `JWT_SECRET`. In production `JWT_SECRET` is required; the process will not start with a missing secret.

### 1. Express API (`:5000`)

```bash
cd backend
npm install
npm run dev
```

Health: `GET http://localhost:5000/api/health`

Tests:

```bash
cd backend
npm test
```

### 2. FastAPI ML service (`:8000`)

```bash
cd ml-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
PYTHONUNBUFFERED=1 .venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

macOS XGBoost needs OpenMP (`brew install libomp`). Train still runs Linear Regression and Random Forest if XGBoost cannot load.

- Health: `GET http://localhost:8000/health` (lists only `.pkl` files that exist)
- Swagger: `http://localhost:8000/docs`

### 3. Next.js (`:3000`)

```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:3000` — sign in at `/login` or `/register`.

---

## Express API (running endpoints)

All routes below except `/`, `/api/health`, `/api/auth/register`, and `/api/auth/login` require `Authorization: Bearer <token>`. `/api/admin/*` also requires `role: ADMIN` in MongoDB.

| Method | Path | Notes |
|--------|------|--------|
| GET | `/` | Service index |
| GET | `/api/health` | API + Mongo status |
| POST | `/api/auth/register` | `{ name, email, password }` |
| POST | `/api/auth/login` | `{ email, password }` |
| GET | `/api/auth/me` | Current user from the database |
| GET POST | `/api/income` | List / create |
| GET PATCH DELETE | `/api/income/:id` | Owner only |
| GET POST | `/api/expenses` | List / create |
| GET PATCH DELETE | `/api/expenses/:id` | Owner only |
| GET | `/api/summary` | `?months=6` live totals |
| GET POST | `/api/budgets` | `?month=YYYY-MM` |
| GET PATCH DELETE | `/api/budgets/:id` | |
| GET POST | `/api/goals` | Savings goals |
| GET PATCH DELETE | `/api/goals/:id` | |
| GET PATCH | `/api/profile` | Name and extras |
| GET | `/api/health-score` | Weighted 0–100 score |
| GET | `/api/predictions` | Latest stored forecast |
| POST | `/api/predictions/train` | Calls ML `/train` then `/predict` |
| GET | `/api/anomalies` | Stored flags |
| POST | `/api/anomalies/scan` | Calls ML `/anomalies` |
| PATCH | `/api/anomalies/:id` | `{ status: VERIFIED \| DISMISSED }` |
| POST | `/api/assistant/ask` | `{ question, useOllama? }` |
| GET | `/api/reports` | Statement JSON for the signed-in user |
| GET | `/api/reports/export.pdf` | PDF download |
| GET | `/api/reports/export.xls` | Excel download |
| GET | `/api/notifications` | Syncs budget overruns + unresolved anomalies |
| PATCH | `/api/notifications/read-all` | |
| PATCH | `/api/notifications/:id/read` | |
| GET | `/api/admin/overview` | User / transaction counts + audit log |

Income and expense list filters: `search`, `from`, `to` (`YYYY-MM-DD`). Income also `incomeType`. Expense also `category`, `transactionType`, `paymentMethod`.

Auth login/register are rate-limited. Other JSON routes share a global limiter. `requireAuth` verifies the JWT, then loads the user from Mongo (deleted users and forged `role` claims are rejected).

---

## ML service endpoints

Called by Express, not by the browser.

| Method | Path | Body |
|--------|------|------|
| GET | `/health` | — |
| POST | `/train` | `{ userId, expenses[], incomes[] }` |
| POST | `/predict` | `{ userId, expenses[], incomes[] }` |
| POST | `/anomalies` | `{ userId, expenses[] }` |

CORS allows the local frontend/backend origins with credentials. It does **not** use `allow_origins=["*"]` together with `allow_credentials=True`.

---

## Admin access

New accounts are `USER`. There is no public promote endpoint. Set `role` to `ADMIN` in Mongo, then sign in again so `/api/auth/me` returns the updated role.
