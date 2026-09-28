# SmartFin AI - Python ML Microservice

FastAPI-powered machine learning microservice for **SmartFin AI**.

## Responsibilities
1. **Expense Prediction**: Training and evaluating Linear Regression, Random Forest Regressor, and XGBoost Regressor on user historical transaction data.
2. **Anomaly Detection**: Identifying unusual spikes and outlier expenses using Isolation Forest and statistical Z-Score thresholding.
3. **Spending Pattern Analytics**: Detecting categorical trends, rate of expense escalation, and seasonal variations.

## Quick Start

```bash
cd ml-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app/main.py
```

Mac users: XGBoost needs OpenMP (`brew install libomp`). Without it, train still runs Linear Regression and Random Forest.

Server runs at `http://localhost:8000`.
- Health: `GET /health` (lists only model files that actually exist)
- Train: `POST /train`
- Predict: `POST /predict`
- Anomalies: `POST /anomalies`

CORS allows the local frontend (`:3000` / `:3001`) and Express (`:5000`) origins with credentials. Do not use `allow_origins=["*"]` with `allow_credentials=True`.

Prefer uvicorn (above) over `python app/main.py`.
