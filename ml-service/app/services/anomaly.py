from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from typing import Any, Dict, List, Tuple

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest

from app.schemas import ExpenseItem
from app.services.registry import user_dir

CATEGORIES = [
    "Food",
    "Transport",
    "Rent",
    "Bills",
    "Education",
    "Healthcare",
    "Shopping",
    "Entertainment",
    "Travel",
    "Utilities",
    "Other",
]
CATEGORY_INDEX = {name: idx for idx, name in enumerate(CATEGORIES)}


def _code(category: str) -> int:
    return CATEGORY_INDEX.get(category if category in CATEGORY_INDEX else "Other", CATEGORY_INDEX["Other"])


def build_matrix(expenses: List[ExpenseItem]) -> Tuple[np.ndarray, Dict[str, Any]]:
    by_category = defaultdict(list)
    amounts = []
    for item in expenses:
        by_category[item.category].append(item.amount)
        amounts.append(item.amount)

    global_median = float(np.median(amounts)) if amounts else 1.0
    category_median = {
        name: float(np.median(values)) if values else global_median for name, values in by_category.items()
    }

    rows = []
    for item in expenses:
        parsed = datetime.strptime(item.date[:10], "%Y-%m-%d")
        cat_med = category_median.get(item.category, global_median) or 1.0
        rows.append(
            [
                float(item.amount),
                float(np.log1p(item.amount)),
                float(_code(item.category)),
                float(parsed.day),
                float(parsed.weekday()),
                1.0 if parsed.weekday() >= 5 else 0.0,
                float(item.amount / cat_med),
                float(item.amount / (global_median or 1.0)),
                1.0 if item.recurring else 0.0,
                1.0 if item.transactionType == "WANT" else 0.0,
            ]
        )

    return np.asarray(rows, dtype=float), {
        "global_median": global_median,
        "category_median": category_median,
    }


def _severity(score: float, amount: float, typical: float) -> str:
    ratio = amount / typical if typical else 1.0
    if score <= -0.12 or ratio >= 2.5:
        return "HIGH"
    if score <= -0.04 or ratio >= 1.6:
        return "MEDIUM"
    return "LOW"


def _reason(item: ExpenseItem, typical: float, score: float) -> str:
    typical = typical or 0.0
    ratio = item.amount / typical if typical else 0.0
    if typical <= 0:
        return f"{item.category} amount Rs. {item.amount:,.0f} was flagged by Isolation Forest (score {score:.3f})."
    return (
        f"{item.category} amount Rs. {item.amount:,.0f} is {ratio:.1f}× the typical "
        f"Rs. {typical:,.0f} for this category (Isolation Forest score {score:.3f})."
    )


def detect_anomalies(user_id: str, expenses: List[ExpenseItem]) -> Dict[str, Any]:
    if len(expenses) < 8:
        raise ValueError("Need at least 8 expense entries to scan for anomalies.")

    matrix, stats = build_matrix(expenses)
    directory = user_dir(user_id)
    path = directory / "isolation_forest.pkl"

    model = IsolationForest(n_estimators=100, contamination=0.15, random_state=42)
    model.fit(matrix)
    joblib.dump({"model": model, "categories": CATEGORIES}, path)

    flags = model.predict(matrix)
    scores = model.decision_function(matrix)

    anomalies = []
    for item, flag, score in zip(expenses, flags.tolist(), scores.tolist()):
        if flag != -1:
            continue
        typical = float(stats["category_median"].get(item.category, stats["global_median"]))
        rounded_score = round(float(score), 4)
        anomalies.append(
            {
                "expenseId": item.id,
                "expenseDescription": item.description or item.category,
                "amount": round(float(item.amount), 2),
                "normalAverage": round(typical, 2),
                "category": item.category if item.category in CATEGORY_INDEX else "Other",
                "anomalyScore": rounded_score,
                "severity": _severity(rounded_score, item.amount, typical),
                "reason": _reason(item, typical, rounded_score),
                "date": item.date,
            }
        )

    anomalies.sort(key=lambda row: row["anomalyScore"])
    return {
        "status": "success",
        "count": len(anomalies),
        "anomalies": anomalies,
        "model": "IsolationForest",
    }
