# SmartFin AI — Full Project Report

**AI-Powered Personal Finance Management and Expense Prediction System**  
University Final Year Project. Currency throughout the product is **Pakistani Rupees (Rs. / PKR)**.

This document is the complete report of **what the repository actually implements today**: purpose, architecture, every feature and its logic, data model, APIs, frontend surfaces, ML pipeline, jobs, security, tests, and known gaps. Setup instructions are included at the end.

---

## 1. What the system is

SmartFin AI is a three-service personal-finance product:

1. Users create an account, log income and expenses (typed, imported, receipt-scanned, or WhatsApp), and keep budgets, savings goals, debts, and net-worth items.
2. Live ledger totals drive a **financial health score**, **rule-based recommendations**, **notifications**, **PDF/Excel reports**, and a **rules-first AI assistant** (optional Ollama/OpenAI wrapping).
3. A Python microservice trains **per-user expense forecast models**, flags **anomalous spend**, estimates **forecast intervals**, and clusters **spending behaviour**.

The product is scoped to one household user at a time. There is no bank-link or Open Banking integration. All money data is user-entered or parsed from files/images/chat.

---

## 2. Architecture

```
Browser  Next.js App Router  :3000
   │  same-origin /api/*  (Next rewrite)
   ▼
Express  TypeScript REST API  :5000
   │  JWT + MongoDB
   ├─ FastAPI ML  :8000     train / predict / anomalies / forecast-intervals / behavior
   ├─ Ollama      :11434    optional; assistant wording only
   ├─ OpenAI Vision         optional; receipt OCR (AI_API_KEY)
   ├─ Resend / nodemailer   optional; transaction emails
   └─ Twilio WhatsApp       optional; alerts + inbound log webhook
```

**Request path:** the browser never calls FastAPI. `frontend/lib/api.ts` uses same-origin `/api/...` so `frontend/next.config.mjs` rewrites to `NEXT_PUBLIC_BACKEND_URL` (default `http://localhost:5000`). Express then calls `ML_SERVICE_URL` (default `http://localhost:8000`).

If MongoDB is down, the API still starts; authenticated routes return **503** until the database is reachable.

---

## 3. Technology stack

| Layer | Choice |
|--------|--------|
| Frontend | Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Recharts, Lucide |
| Backend | Node.js, Express 4, TypeScript, Mongoose 8, Zod, JWT, bcryptjs, Helmet, Morgan, express-rate-limit, Multer, xlsx |
| Database | MongoDB (local or Atlas) |
| ML | Python 3.11, FastAPI, scikit-learn, pandas/numpy, joblib, optional XGBoost |
| Tests | Vitest + Supertest + mongodb-memory-server (backend only) |
| Orchestration | Root `npm run dev:all` via `concurrently` |

There is **no Docker Compose** in the repo. There are **no frontend unit tests**.

---

## 4. Repository layout

```
frontend/                 Next.js UI
  app/                    Pages (App Router)
  components/             Layout, auth guards, landing, command center
  context/                AuthContext (JWT in localStorage)
  services/               One client per API area
  lib/                    api.ts, theme.ts, mockData.ts (unused demo fixtures)
backend/
  server.ts               Listen, DB connect, start schedulers
  src/app.ts              Middleware + route mount
  src/config/             env, Mongo connection
  src/middleware/         auth, Zod validate, rate limit, audit, errors
  src/modules/            Feature modules (model / routes / service / controller / validation)
  src/jobs/               Recurring, health-history, weekly ML pipeline
  src/__tests__/          Auth, income, expense, assistant, receipt parser
ml-service/
  app/main.py             FastAPI app + CORS
  app/routes/             health, train, predict, anomalies, forecast, behavior
  app/services/           features, forecast, anomaly, intervals, behavior, registry
  trained_models/         Per-user .pkl files (gitignored)
docs/                     Shorter API notes (older; this README is the source of truth)
samples/                  Mock income/expense CSV templates
```

---

## 5. Data model (MongoDB collections)

Every financial collection is **scoped by `userId`**. List/get/update/delete queries include that field so users cannot read each other’s rows.

| Collection | Source model | Purpose and key fields |
|------------|--------------|------------------------|
| `users` | `auth/user.model.ts` | `name`, unique `email`, hashed `password` (`select: false`), optional `phone`, `role` (`USER` \| `ADMIN`), profile extras (`occupation`, `age`, `monthlyIncome`, `familySize`, `financialGoal`, `riskPreference`), password-reset hash + expiry |
| `incomes` | `income.model.ts` | `amount`, `source`, `date`, `incomeType` (Salary, Freelance, Business, Investment, Gift, Other), `description`, `recurring` |
| `expenses` | `expense.model.ts` | `amount`, `category` (Food, Transport, Rent, Bills, Education, Healthcare, Shopping, Entertainment, Travel, Utilities, Other), optional `subcategory`, `date`, `paymentMethod`, `description`, `transactionType` (`NEED` \| `WANT`), `recurring` |
| `budgets` | `budget.model.ts` | `amount`, `month` (`YYYY-MM`), optional `category` (null = overall). Unique `{ userId, month, category }` |
| `savingsgoals` | `goal.model.ts` | `name`, `targetAmount`, `currentAmount`, `deadline`, `priority` (LOW/MEDIUM/HIGH). Status is **derived** in the service: COMPLETED / OVERDUE / ACTIVE |
| `goalcontributions` | `goal.contribution.model.ts` | History of contributions (`SALARY` \| `SAVINGS`) when posting to a goal |
| `debts` | `debt.model.ts` | `name`, `principal`, `interestRate`, `tenureMonths`, stored `emiAmount`, `paidMonths`, `startDate`, `notes` |
| `networthitems` | `networth.model.ts` | `kind` (asset \| liability), `name`, `category`, `value`, `asOfDate` |
| `predictions` | `prediction.model.ts` | Latest next-month forecast: amount, previous month, deltas, `modelUsed`, MAE/RMSE/MAPE/R², compared models, per-category predictions, `monthsUsed` |
| `anomalies` | `anomaly.model.ts` | Flagged expense: `expenseId`, amount vs `normalAverage`, `anomalyScore`, `severity`, `reason`, `status` UNRESOLVED/VERIFIED/DISMISSED. Unique `{ userId, expenseId }` |
| `notifications` | `notification.model.ts` | Upserted alerts (`budget`, `anomaly`, `goal`, `health`, `prediction`). Unique `{ userId, sourceId }` |
| `auditlogs` | `audit.model.ts` | Successful mutating requests after auth |
| `assistantmessages` | `assistant.model.ts` | Chat history (`user` \| `assistant`), trimmed to 200 messages |
| `healthscoresnapshots` | `health-history.model.ts` | Monthly snapshot of the health score. Unique `{ userId, monthKey }` |
| `merchantrules` | `categorize/merchant-rule.model.ts` | Per-user merchant → category overrides. Unique `{ userId, merchant }` |

Subscriptions are **not a collection**. They are inferred from recurring / Bills / Utilities / Rent / Entertainment expenses.

---

## 6. Cross-cutting backend logic

### 6.1 Auth and sessions

- Register / login issue a JWT (`id`, `email`, `role`) signed with `JWT_SECRET` (required in production; a fixed dev secret is used otherwise). Default expiry **7 days**.
- Password hashed with **bcrypt (cost 10)** on save.
- `requireAuth` verifies the JWT, then **reloads the user from Mongo**. Deleted users fail. Role is taken from the **database**, not the token, so a forged `role` claim cannot grant admin.
- `requireAdmin` reloads again and requires `role === 'ADMIN'`.
- New accounts are always `USER`. Admins can change roles via `PATCH /api/admin/users/:id/role`. An admin cannot demote **themselves**.
- Forgot-password: SHA-256 of a random token stored for **1 hour**. The API **does not send email**; in non-production it returns `resetUrl` so the UI can complete the flow. Production omits the URL (so reset is incomplete unless mail is added).
- JWT is stored in the browser as `localStorage.smartfin_token` (also a legacy `token` key). This is convenient for a student project; it is not httpOnly-cookie security.

### 6.2 Validation, errors, limits

- Zod schemas on most JSON bodies; `validate` / `validateQuery` middleware.
- `AppError` + central `errorHandler`. Unhandled errors expose the message only in development.
- Global limiter: **300 requests / 15 minutes**. Auth limiter: **40 / 15 minutes** on register, login, forgot, reset. Skipped in tests.
- JSON body limit **10 MB**. Receipt uploads go through Multer (error handler mentions **5 MB**).
- CORS: configured frontend URL plus any `http://localhost|127.0.0.1:<port>`. Credentials allowed.
- Helmet is on, but **CSP, HSTS, COOP are disabled** for local/dev convenience.

### 6.3 Audit log

After successful `POST`/`PATCH`/`PUT`/`DELETE` for an authenticated user, a row is written (IP, method, path, action). **Skipped:** health, notifications, assistant, reports. Failed requests are not logged.

### 6.4 Multi-tenancy

Income, expense, budget, goal, debt, net-worth, prediction, anomaly, notification, chat, and search queries always filter `userId`. Tests cover that user B cannot read or mutate user A’s income/expense rows.

---

## 7. Feature-by-feature functionality and logic

### 7.1 Ledger: income and expenses

**Income CRUD** (`/api/income`): create/list/get/update/delete. List filters: `search`, `from`, `to`, `incomeType`. Amounts must be > 0.

**Expense CRUD** (`/api/expenses`): same pattern. Extra filters: `category`, `transactionType`, `paymentMethod`. Need vs Want is stored on every expense and used in summary, health-adjacent insights, ML features, and recommendations.

**Summary** (`GET /api/summary?months=6&month=YYYY-MM`): current month income, expense, savings, savings rate, Need/Want totals, category breakdown, month-over-month percent change, a monthly series, and budget variance (`under` / `on_track` / `over`) against budgets for that month. Dates are treated as **UTC month keys**. This payload is the hub for dashboard, health score, recommendations, reports, and the assistant.

**Alternate create path** `POST /api/transactions`: less strict than the Zod CRUD APIs. Creates income or expense, then optionally emails (Resend) and WhatsApp. “Anomaly” here is **not Isolation Forest** — it is “this expense is over 80% of this month’s category budget.”

**WhatsApp inbound** `POST /api/webhooks/whatsapp`: **no JWT**. Matches `User.phone`, parses phrases like “Spent 500 on Lunch”, writes an expense/income as NEED/Cash. Anyone who can hit the webhook with a registered phone can add transactions. Intended for Twilio, not a public internet surface without Twilio signature verification.

### 7.2 Budgets

Monthly overall or per-category limits. Unique per user/month/category. Service computes `spent`, `remaining`, `utilization`. Over 100% feeds notifications and recommendations.

### 7.3 Savings goals

CRUD plus `POST /api/goals/:id/contribute`. Contribution increases `currentAmount` and writes a `GoalContribution`. Remaining and required monthly pace are computed from deadline. Status: completed if funded; overdue if past deadline with remainder; else active. A goal whose **name matches `/emergency/i`** is treated as the emergency fund for the health score.

### 7.4 Profile and account

`GET/PATCH /api/profile` — name and extras used as fallback monthly income for tax and savings-rate scoring.  
`GET /api/profile/export` — user data dump.  
`DELETE /api/profile/account` — account deletion with validation.

### 7.5 Financial health score (0–100)

`GET /api/health-score` weights five components (sum clamped 0–100):

| Component | Max points | Logic |
|-----------|------------|--------|
| Savings rate | 25 | `(income − expense) / income`; 20% savings → full 25. If no income this month, uses profile `monthlyIncome` when expenses exist. |
| Budget adherence | 20 | Average of budgets: full 20 if utilization ≤ 100%; linear drop to 0 as utilization goes 100% → 150%. No budgets → 0. |
| Expense stability | 15 | Coefficient of variation of monthly expenses; full score if CV is low; need ≥ 2 months or default **7.5**. |
| Emergency fund | 20 | Sum of goals named like “emergency” vs 6× average of last 3 months’ expenses. No such goal → 0. |
| Goal progress | 20 | Average of funded ratio; overdue goals count at 50% of their ratio. No goals → 0. |

Status bands: ≥80 Excellent, ≥65 Good, ≥45 Moderate, else At Risk. Explanations and up to five recommendations are returned.

`GET /api/health-score/emergency-fund` builds a 6-month cover plan (Not started / Building / Adequate / Fully funded).

Daily job stores a snapshot per user per calendar month (`healthscoresnapshots`).

### 7.6 Debts

Standard **reducing-balance EMI**:  
`EMI = P × r × (1+r)^n / ((1+r)^n − 1)` with `r = annualRate/12/100`. Remaining balance is approximated as unpaid EMIs (not a true amortisation leftover of principal). Totals: remaining balance and monthly EMI (only debts with remaining months). These EMIs feed **net worth liabilities** and the **life-plan** cash-flow.

### 7.7 Net worth

Assets and liabilities as user-entered lines. Summary: assets − (liability lines + **debt remaining** from the debt module).

### 7.8 Recurring entries

Templates are the latest `recurring: true` income/expense rows, fingerprinted by source/amount/type or description/amount/category/type. `POST /api/recurring/process` (and a **daily scheduler**) copies missing fingerprints into the current UTC month on the same day-of-month (clamped to month length). Duplicates for that month are skipped.

### 7.9 Subscriptions (inferred)

Groups expenses that are recurring or in Bills/Utilities/Rent/Entertainment. Frequency is treated as **monthly**. If the latest amount is **> 5%** above the previous, status becomes INCREASED and a price-increase alert is added. Next expected date = last charge + 1 month.

### 7.10 Import (Excel/CSV)

`GET` templates (xlsx + separate income/expense CSV). `POST /preview` and `POST /` with file upload. Parses workbook sheets, max **1000 rows per sheet**, rejects commit if any row error. Valid rows are inserted as incomes/expenses.

### 7.11 Bank-statement reconcile

`POST /api/reconcile` scores statement lines (date, amount, description) against existing expenses (amount match, day distance, token overlap). `POST /api/reconcile/import` can create expenses for unmatched lines.

### 7.12 Receipt scan

`POST /api/receipts/scan` (multipart or base64). Uses **OpenAI Vision** (`AI_API_KEY`, default model `gpt-4o-mini`) with a strict “do not invent fields” prompt, then **cross-checks total against OCR text labels** (Total / Grand Total / etc.). Category inferred from merchant/items if the model is weak. Returns structured fields + confidence + warnings. **Does not auto-create an expense** (the scan UI is expected to confirm). May send a “Receipt Scan” email. Without `AI_API_KEY`, scan fails.

### 7.13 Auto-categorise

`GET /api/categorize/suggest?description=`  
Priority: user `MerchantRule` → known merchants (Daraz, Foodpanda, Netflix, K-Electric, Careem, Uber, etc.) → keyword map → user’s past similar descriptions → Other. Confidence 0.3–0.99.  
`GET /api/categorize/duplicates` finds likely duplicate expenses.

### 7.14 Global search

`GET /api/search?q=` (min 2 chars) regex-searches income, expense, budget, goal and returns typed hits with UI hrefs.

### 7.15 Reports

`GET /api/reports` JSON statement for a month: profile, summary, budgets, goals, health, latest prediction, income/expense rows.  
`GET /api/reports/export.pdf` and `/export.xls` download the same period.

### 7.16 Notifications

On list, the service **syncs from live data**: budget utilization > 100%, unresolved anomalies, overdue/at-risk goals, weak health, rising forecast. Upsert by `sourceId`. Users can mark one or all read.

### 7.17 Recommendations and AI insights

**Recommendations** (`GET /api/recommendations`): rule engine over summary, budgets, goals, health, prediction, unresolved anomaly count, profile. Types warning / tip / positive with a numeric priority (e.g. health < 45 → 95).

**Insights** (`GET /api/insights`): similar narrative cards with types like SPENDING_SPIKE, BUDGET_RISK, FORECAST_RISK, plus links back into the app.

### 7.18 What-if simulator

`POST /api/simulator` applies `incomeChangePercent`, optional category cut, and `extraSavingsMonthly` to **this month’s** summary only. Projected health score is **not** a full recalculation: +5 if savings rate crosses 20% upward, −5 if it falls below 10%.

### 7.19 Tax planner (Pakistan, estimate only)

`GET /api/tax-planner`  
- Tax year: **1 July – 30 June** UTC.  
- Taxable income: sum of ledger income in that window, else `profile.monthlyIncome × 12`.  
- **Salaried slabs** (TY-style): 0% to 600k; 5% over 600k to 1.2M; then 15/25/30/35% with the published bases (30k, 180k, 430k, 700k).  
- Zakat: 2.5% of cash/savings/gold-named assets **plus goal balances**, only if that base **> Rs. 200,000** nisab estimate.  
The API labels this as an estimate, not filing advice.

The **Compliance UI** (`/compliance`) currently runs **its own client-side FBR/Zakat/retirement calculator** with default numbers and does **not** call `/api/tax-planner` or `/api/life-plan`. Backend tax/life-plan remain available to other pages (`/tax-planner`, `/life-plan`) if those routes are opened directly.

### 7.20 Life plan (Monte Carlo)

`POST /api/life-plan` with years (1–10), annual income growth (−20–30%), inflation (0–25%). Seeds RNG from `userId` (reproducible). **800 paths**, monthly: income grows with noise, spending inflates, leftover after EMI goes to goals and net worth. Returns p10/p50/p90 ending worth, yearly bands, and % of paths that fully fund remaining goals. Needs at least some income or expense history.

### 7.21 ML: train, predict, anomalies, intervals, behaviour

Express loads the user’s expenses (and incomes for train/predict) and POSTs them to FastAPI.

**Train** (`POST /train`): monthly category series + lag features (`month_num`, `month_index`, `category_code`, `lag1`, `lag2`, `month_total_lag1`, `income_lag1`, `txn_count_lag1`). Fits Linear Regression (scaled), Random Forest, and XGBoost if OpenMP/XGBoost loads. Hold-out last month for MAE/RMSE/MAPE/R². Best model by MAE is saved under `trained_models/<userId>/`. Need **≥ 3 distinct months** of expenses (enforced in Express as “add expenses in at least 3 different months”).

**Predict** (`POST /predict`): loads saved models, predicts next calendar month total and per-category amounts, compares to previous month.

**Anomalies** (`POST /anomalies`): Isolation Forest on amount, log amount, category code, day, weekday, weekend flag, amount/category median, amount/global median, recurring, WANT flag. Severity from score and ratio vs typical. Express upserts flags and **deletes UNRESOLVED rows no longer flagged**. Need **≥ 8 expenses**.

**Forecast intervals** (`POST /forecast-intervals`): Linear Regression on monthly totals, residual bootstrap (**400 draws**, **6-month horizon**), p10/p50/p90 bands. Need **≥ 4 months**.

**Behaviour** (`POST /behavior`): KMeans (up to 3 clusters) on monthly category-share vectors + want share. Labels Discretionary / Fixed-cost / “X-heavy” and a one-line intervention. Need **≥ 3 months**. Silhouette score when cluster count and sample size allow.

**Weekly job** (first run after 2 minutes, then every 7 days): for every user, train+predict if ≥3 months, anomaly scan if ≥8 expenses.

`POST /api/ml-pipeline/run` does the same for the signed-in user.

### 7.22 AI assistant

Pipeline:

1. Load live context (profile name, summary month, budgets, goals, health, last prediction).
2. **Intent parser** (keyword/period/category/what-if/education/follow-up): GREETING, HELP, totals, salary, category spend, largest expense, comparison, budget, goals, forecast, health, Need vs Want, COMPOSITE, CLARIFICATION, WHAT_IF, FINANCIAL_EDUCATION, etc.
3. **Engine** runs Mongo aggregations (`financial-query.service`) and formats PKR answers (`response-builder`). What-if uses `affordability.service`. Education uses static topics.
4. If the engine produced a verified answer, optional **Ollama** (or other `AI_PROVIDER`) **rephrases** it with a secure financial context; it should not invent numbers. If Ollama is down, **FallbackAIProvider** returns the engine text as structured `{ summary, source }`.
5. Exchange saved; history capped at 200.

`GET /api/assistant/status` reports Ollama availability. Chat can be listed or cleared.

### 7.23 Admin

`GET /api/admin/overview` — user/transaction/prediction/anomaly counts + last 50 audit logs.  
`GET /api/admin/users` — up to 200 users.  
`PATCH /api/admin/users/:id/role` — USER/ADMIN. All require `requireAdmin`.

### 7.24 Background jobs (process lifetime)

| Job | Interval | Action |
|-----|----------|--------|
| Recurring | immediately, then 24h | Auto-create this month’s recurring incomes/expenses for all users |
| Health history | immediately, then 24h | Snapshot health score per user for current month |
| ML pipeline | 2 minutes after boot, then 7 days | Train+predict and anomaly-scan eligible users |

Stopped on SIGINT/SIGTERM. Not run when `NODE_ENV=test`.

---

## 8. Express API map

Unless noted, routes need `Authorization: Bearer <token>`. Admin routes also need `role: ADMIN` in Mongo.

| Method | Path | Function |
|--------|------|----------|
| GET | `/` | Service index JSON |
| GET | `/api/health` | API + Mongo ready state |
| POST | `/api/auth/register` | Create USER, return JWT |
| POST | `/api/auth/login` | JWT |
| POST | `/api/auth/forgot-password` | Start reset (no email send) |
| POST | `/api/auth/reset-password` | Complete reset, return JWT |
| GET | `/api/auth/me` | Current user from DB |
| GET POST | `/api/income` | List / create |
| GET PATCH DELETE | `/api/income/:id` | Owner only |
| GET POST | `/api/expenses` | List / create |
| GET PATCH DELETE | `/api/expenses/:id` | Owner only |
| GET | `/api/summary` | Live totals |
| GET POST | `/api/budgets` | List / create |
| GET PATCH DELETE | `/api/budgets/:id` | |
| GET POST | `/api/goals` | List / create |
| GET PATCH DELETE | `/api/goals/:id` | |
| POST | `/api/goals/:id/contribute` | Add to currentAmount |
| GET PATCH | `/api/profile` | Profile |
| GET | `/api/profile/export` | Data export |
| DELETE | `/api/profile/account` | Delete account |
| GET | `/api/health-score` | 0–100 score |
| GET | `/api/health-score/emergency-fund` | Reserve plan |
| GET | `/api/predictions` | Latest stored forecast |
| POST | `/api/predictions/train` | ML train + predict + persist |
| GET | `/api/anomalies` | Stored flags |
| POST | `/api/anomalies/scan` | ML scan + upsert |
| PATCH | `/api/anomalies/:id` | VERIFIED / DISMISSED |
| GET | `/api/assistant/status` | Ollama / provider |
| GET DELETE | `/api/assistant/messages` | Chat history |
| POST | `/api/assistant/ask` | `{ question, useOllama?, history? }` |
| GET | `/api/import/template` | xlsx template |
| GET | `/api/import/template/income.csv` | CSV |
| GET | `/api/import/template/expenses.csv` | CSV |
| POST | `/api/import/preview` | Parse only |
| POST | `/api/import` | Commit rows |
| GET | `/api/reports` | Statement JSON |
| GET | `/api/reports/export.pdf` | PDF |
| GET | `/api/reports/export.xls` | Excel |
| GET | `/api/notifications` | Sync + list |
| PATCH | `/api/notifications/read-all` | |
| PATCH | `/api/notifications/:id/read` | |
| GET | `/api/recurring` | Templates |
| POST | `/api/recurring/process` | Materialise this month |
| GET | `/api/recommendations` | Rule tips |
| GET | `/api/search` | Global search |
| GET POST | `/api/debts` | List / create |
| PATCH DELETE | `/api/debts/:id` | |
| GET POST | `/api/networth` | Summary+create |
| PATCH DELETE | `/api/networth/:id` | |
| POST | `/api/simulator` | Month what-if |
| GET | `/api/health-history` | Snapshots |
| POST | `/api/health-history/record` | Record now |
| GET | `/api/categorize/suggest` | Category guess |
| GET | `/api/categorize/duplicates` | Duplicate hint |
| POST | `/api/ml-pipeline/run` | Train + anomaly for self |
| GET | `/api/admin/overview` | Admin stats |
| GET | `/api/admin/users` | User list |
| PATCH | `/api/admin/users/:id/role` | Set role |
| GET | `/api/subscriptions` | Inferred subs |
| POST | `/api/receipts/scan` | Vision OCR |
| GET | `/api/insights` | Insight cards |
| GET | `/api/tax-planner` | FBR + zakat estimate |
| POST | `/api/forecast-lab` | Interval bands |
| POST | `/api/behavior` | KMeans profile |
| POST | `/api/reconcile` | Match statement |
| POST | `/api/reconcile/import` | Import unmatched |
| POST | `/api/life-plan` | Monte Carlo plan |
| POST | `/api/transactions` | Alternate ledger create + alerts |
| POST | `/api/webhooks/whatsapp` | **Public** Twilio-style webhook |

---

## 9. ML service API (Express only)

CORS: local frontend/backend origins with credentials (not `*`).

| Method | Path | Body | Result |
|--------|------|------|--------|
| GET | `/` | — | Index |
| GET | `/health` | — | Process + existing `.pkl` files |
| POST | `/train` | `{ userId, expenses[], incomes[] }` | Metrics + saved models |
| POST | `/predict` | same | Next-month point forecast |
| POST | `/anomalies` | `{ userId, expenses[] }` | Flagged rows |
| POST | `/forecast-intervals` | predict-shaped body | p10/p50/p90 path |
| POST | `/behavior` | `{ userId, expenses[] }` | Cluster profile |

Swagger: `http://localhost:8000/docs`.

---

## 10. Frontend

### 10.1 Shell and auth

- Root layout: IBM Plex fonts, dark slate theme, `AppProviders` (Auth).
- `/` landing; signed-in users redirect to `/dashboard`.
- `/login`, `/register`, `/forgot-password`, `/reset-password`.
- `AuthGuard` wraps the app chrome; `RoleGuard` for admin.
- Sidebar **core navigation** is four items: Dashboard, Money & Accounts, AI Intelligence Hub, Compliance & Life Plan, plus Admin when `role === ADMIN`.

### 10.2 Primary pages (sidebar)

| Route | Role |
|-------|------|
| `/dashboard` | Month income/expense/savings, health, charts, insights, anomalies, recommendations, quick add, receipt camera link |
| `/money` | Hub tabs (`?tab=`): ledger, budgets, goals, debts, net worth, subscriptions, reports/import-style actions — loads expenses, incomes, budgets, goals, debts, net worth, subscriptions |
| `/ai-insights` | Prediction, forecast lab, behaviour, anomalies, recommendations, inline copilot chat |
| `/compliance` | Client-side FBR tax, zakat, and a simple retirement/savings simulator (defaults, not wired to tax-planner/life-plan APIs) |
| `/admin` | Overview, users, role change, audit |

### 10.3 Additional routes still in `app/` (reachable by URL / older links)

These are full pages, not all listed in the sidebar. They still call live APIs:

- `/income`, `/expenses`, `/expenses/scan`, `/budgets`, `/savings-goals`
- `/debts`, `/networth`, `/recurring`, `/subscriptions`
- `/import`, `/reconcile`, `/reports`, `/analytics`
- `/predictions`, `/anomalies`, `/forecast-lab`, `/behavior`
- `/assistant`, `/ai-assistant` (full copilot UI)
- `/recommendations`, `/ai-insights` (hub also covers this)
- `/tax-planner`, `/life-plan`, `/financial-health`
- `/profile`, `/notifications`

`frontend/lib/mockData.ts` holds unused Alex Mercer demo data; production pages use services.

### 10.4 Client services

`auth`, `income`, `expense`, `budget`, `goal`, `summary`, `score`, `prediction`, `anomaly`, `assistant`, `report`, `notification`, `import`, `admin`, `recurring`, `recommendations`, `search`, `debt`, `networth`, `health-history`, `categorize`, `ml-pipeline`, `receipt`, `insights`, `subscriptions`, `advanced` (forecast lab + behaviour).

Command palette (`CommandCenter`) and `QuickActionModal` add income/expense without leaving the dashboard.

---

## 11. Environment variables

**Backend (`backend/.env`)**

| Variable | Role |
|----------|------|
| `PORT` | Default 5000 |
| `NODE_ENV` | development / production / test |
| `MONGODB_URI` | Database |
| `MONGODB_USER` / `MONGODB_PASSWORD` | Optional |
| `JWT_SECRET` | Required in production |
| `JWT_EXPIRES_IN` | Default `7d` |
| `ML_SERVICE_URL` | Default `http://localhost:8000` |
| `FRONTEND_URL` | CORS + reset links |
| `OLLAMA_URL` / `OLLAMA_MODEL` | Assistant rephrase |
| `AI_API_KEY` / `AI_MODEL` | Receipt Vision |
| `AI_PROVIDER` | Assistant provider selection |
| Resend / Twilio | Used by email and WhatsApp helpers when configured |

**Frontend (`frontend/.env`)**

| Variable | Role |
|----------|------|
| `NEXT_PUBLIC_BACKEND_URL` | Rewrite target (default localhost:5000) |
| `NEXT_PUBLIC_ML_SERVICE_URL` | Present in example; browser does not call ML directly |

**ML (`ml-service/.env`)**

`PORT`, `HOST`, `DEBUG`, `BACKEND_URL`, `FRONTEND_URL`, `MODEL_DIR`, `DATASET_DIR`.

---

## 12. Tests

```bash
cd backend
npm test
```

| File | Coverage |
|------|----------|
| `auth.test.ts` | Register, duplicate email, login, `/me`, forged/invalid token |
| `income.test.ts` | CRUD + user isolation |
| `expense.test.ts` | CRUD + user isolation |
| `assistant.test.ts` / `assistant.parser.test.ts` | Ask flow / intent parsing |
| `receipt.parser.test.ts` | Total/OCR helpers |

**Not covered by automated tests:** budgets, goals, debts, ML client, admin, import, tax, life-plan, WhatsApp, most jobs. **No frontend tests.**

---

## 13. Design choices (logic summary)

- **Single source of truth for money** is Mongo incomes/expenses, not bank feeds.
- **UTC month keys** (`YYYY-MM`) unify budgets, summary, recurring, tax year windows.
- **Need/Want** is user-labelled, not inferred (except categoriser defaults for known merchants).
- **Health score is deterministic and explainable**; ML is not used in the 0–100 score.
- **Assistant is ledger-grounded first**; LLMs wrap wording so numbers stay from queries.
- **ML is per-user**, trained on that user’s series only (cold start: 3–8 months of data depending on endpoint).
- **Pakistan-oriented**: PKR, FBR salaried slabs, zakat/nisab, local merchants in the categoriser.

---

## 14. Gaps, inconsistencies, and risks (as implemented)

These are observations from the current code, not a backlog commitment.

1. **Root README/docs were previously incomplete** — many modules (debts, net worth, tax, life-plan, WhatsApp, etc.) were missing from the old endpoint tables.
2. **Two UIs for tax/life-plan:** `/compliance` is local calculators; `/api/tax-planner` and `/api/life-plan` are unused by that page. Nisab differs (UI ~165k silver vs API 200k).
3. **Sidebar hides many working pages**; users must know `/expenses/scan`, `/import`, `/profile`, etc., or use in-hub buttons.
4. **Forgot-password does not email** a link in production.
5. **WhatsApp webhook is unauthenticated**; no Twilio signature check in code.
6. **`POST /api/transactions`** bypasses Zod enums (category/paymentMethod) more loosely than `/api/expenses`.
7. **Debt remaining** uses remaining EMI × months, not outstanding principal after amortisation.
8. **Simulator health delta** is a ±5 heuristic, not a replay of `getHealthScore`.
9. **Subscriptions** assume monthly and a broad category filter (includes one-off Bills).
10. **JWT in localStorage** is XSS-sensitive; Helmet CSP is off.
11. **CORS allows any localhost port** — fine for FYP, not for a public API.
12. **Receipt scan emails** on scan, not necessarily after the user saves an expense.
13. **`frontend/lib/mockData.ts`** is leftover and unused by live pages.
14. **ML cold start** is strict; empty accounts cannot train or scan.
15. **XGBoost** may be absent on macOS without OpenMP; train still uses LR + RF.
16. **Test coverage** is thin relative to module count.
17. **No Docker / CI config** in-repo for the three services together.
18. **Admin promote** exists in-app now; first admin still needs a Mongo role edit or a seed unless one account is patched.

---

## 15. Sample data

`samples/smartfin-income-mock.csv` and `samples/smartfin-expenses-mock.csv` match the import templates for demos and screenshots.

---

## 16. How to run locally

Copy `backend/.env.example` → `backend/.env` and set `MONGODB_URI` plus a `JWT_SECRET`. In production `JWT_SECRET` is required.

### Option A — all three processes

```bash
npm install
cd backend && npm install && cd ../frontend && npm install && cd ..
# ML: python -m venv ml-service/.venv && pip install -r ml-service/requirements.txt
npm run dev:all
```

(`dev:ml` expects `ml-service/.venv` and Unix-style python paths; on Windows run uvicorn from `ml-service` manually.)

### Option B — separate terminals

**1. Express (`:5000`)**

```bash
cd backend
npm install
npm run dev
```

Health: `http://localhost:5000/api/health`

**2. FastAPI (`:8000`)**

```bash
cd ml-service
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

macOS XGBoost needs OpenMP (`brew install libomp`). Train still runs Linear Regression and Random Forest if XGBoost cannot load.

- Health: `http://localhost:8000/health`
- Swagger: `http://localhost:8000/docs`

**3. Next.js (`:3000`)**

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` — register at `/register` or sign in at `/login`.

### Tests

```bash
cd backend
npm test
```

### Admin access

New accounts are `USER`. Promote in Mongo (`role: "ADMIN"`) or sign in as an existing admin and use **System Administration** → change role, then sign in again so `/api/auth/me` returns `ADMIN`.

---

## 17. Typical user flow (end to end)

1. Register → JWT stored → dashboard.
2. Add profile monthly income (helps tax + savings-rate when the month has no income rows).
3. Add income/expenses (form, import, receipt scan + confirm, or WhatsApp if configured).
4. Set month budgets and named savings goals (include “Emergency Fund” to score reserves).
5. Optionally add debts and assets/liabilities.
6. Open health score; run **Train forecast** and **Scan anomalies** (or wait for the weekly job).
7. Ask the assistant questions grounded in the ledger; export a monthly PDF/Excel report.
8. Admins inspect counts and audit logs.

---

*This report describes the codebase as reviewed. If a file is added after this date, treat the source modules under `backend/src/modules`, `frontend/app`, and `ml-service/app` as authoritative.*
