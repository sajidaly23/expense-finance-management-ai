# SmartFin AI — API and data notes

This file describes **what the repo actually runs**, not a planned 16-collection design.

## Services

| Service | Default URL | Start |
|---------|-------------|--------|
| Next.js | http://localhost:3000 | `cd frontend && npm run dev` |
| Express | http://localhost:5000 | `cd backend && npm run dev` |
| FastAPI | http://localhost:8000 | `cd ml-service && .venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000` |

Browser calls stay on `:3000/api/*` and are rewritten to Express. The ML service is invoked only from Express (`ML_SERVICE_URL`).

## Collections

Nine Mongoose models, mapped to Mongo collections:

1. **users** — email/password (bcrypt), `role` (`USER` \| `ADMIN`), profile fields (occupation, age, monthlyIncome, familySize, financialGoal, riskPreference)
2. **incomes** — amount, source, date, incomeType, description, recurring, `userId`
3. **expenses** — amount, category, date, paymentMethod, description, transactionType (NEED/WANT), recurring, `userId`
4. **budgets** — amount, month (`YYYY-MM`), optional category (null = overall), unique `{ userId, month, category }`
5. **savingsgoals** — name, target/current amount, deadline, priority, `userId`
6. **predictions** — latest forecast snapshot per train/predict run
7. **anomalies** — flagged expense, severity, status UNRESOLVED/VERIFIED/DISMISSED
8. **notifications** — upserted from budget utilization > 100% and unresolved anomalies (`userId` + `sourceId` unique)
9. **auditlogs** — successful POST/PATCH/PUT/DELETE after auth (notifications, assistant, and reports are skipped)

Every financial document is scoped by `userId`. List/get/update/delete queries include that field.

## Auth and security

- `POST /api/auth/register` and `POST /api/auth/login` issue a JWT.
- `requireAuth` verifies the token, then loads the user from Mongo. A deleted user or a token with a forged `role` does not grant extra access.
- `requireAdmin` (on `/api/admin`) requires `role === 'ADMIN'` in the database.
- `JWT_SECRET` is required when `NODE_ENV=production` (no hardcoded production default).
- Global rate limit (300 / 15 min) plus a tighter limit on register/login (40 / 15 min).
- FastAPI CORS lists explicit local origins; credentials are allowed without `*`.

## Endpoint map

See the tables in the root `README.md`. Quick groups:

- **Ledger**: `/api/income`, `/api/expenses`, `/api/summary`
- **Plans**: `/api/budgets`, `/api/goals`, `/api/profile`, `/api/health-score`
- **ML-backed**: `/api/predictions`, `/api/anomalies` (need the FastAPI process)
- **Outputs**: `/api/assistant/ask`, `/api/reports`, `/api/notifications`
- **Admin**: `/api/admin/overview`

## Tests

```bash
cd backend
npm test
```

Vitest + Supertest + mongodb-memory-server cover register/login/`/me`, income CRUD, expense CRUD, and cross-user isolation (user B cannot read or mutate user A’s rows).
