from __future__ import annotations

from typing import Dict, List

import numpy as np
from sklearn.linear_model import LinearRegression

from app.schemas import ExpenseItem


def _monthly_totals(expenses: List[ExpenseItem]) -> tuple[List[str], np.ndarray]:
    buckets: Dict[str, float] = {}
    for item in expenses:
        key = item.date[:7]
        buckets[key] = buckets.get(key, 0.0) + float(item.amount)
    months = sorted(buckets)
    return months, np.array([buckets[month] for month in months], dtype=float)


def _shift_month(month_key: str, delta: int) -> str:
    year, month = [int(part) for part in month_key.split("-")]
    index = year * 12 + (month - 1) + delta
    return f"{index // 12}-{index % 12 + 1:02d}"


def forecast_intervals(expenses: List[ExpenseItem], horizon: int = 6, draws: int = 400) -> dict:
    months, series = _monthly_totals(expenses)
    if len(series) < 4:
        raise ValueError("Add expenses in at least 4 different months before running the interval forecast.")

    x = np.arange(len(series), dtype=float).reshape(-1, 1)
    model = LinearRegression().fit(x, series)
    fitted = model.predict(x)
    residuals = series - fitted
    if np.allclose(residuals, 0):
        residuals = np.array([series.mean() * 0.05])

    future_x = np.arange(len(series), len(series) + horizon, dtype=float).reshape(-1, 1)
    point = model.predict(future_x)
    rng = np.random.default_rng(42)
    samples = np.zeros((draws, horizon))
    for draw in range(draws):
        noise = rng.choice(residuals, size=horizon, replace=True)
        samples[draw] = np.maximum(0, point + noise)

    last = months[-1]
    bands = []
    for step in range(horizon):
        bands.append(
            {
                "month": _shift_month(last, step + 1),
                "p10": round(float(np.percentile(samples[:, step], 10)), 2),
                "p50": round(float(np.percentile(samples[:, step], 50)), 2),
                "p90": round(float(np.percentile(samples[:, step], 90)), 2),
                "point": round(float(point[step]), 2),
            }
        )

    ss_res = float(np.sum(residuals**2))
    ss_tot = float(np.sum((series - series.mean()) ** 2))
    r2 = 0.0 if ss_tot == 0 else 1 - ss_res / ss_tot
    return {
        "status": "success",
        "model": "Linear trend with residual bootstrap",
        "monthsUsed": len(series),
        "draws": draws,
        "r2": round(r2, 3),
        "history": [{"month": month, "total": round(float(total), 2)} for month, total in zip(months, series)],
        "bands": bands,
    }
