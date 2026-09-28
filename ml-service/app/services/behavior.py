from __future__ import annotations

from typing import Dict, List

import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

from app.schemas import ExpenseItem

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

DISCRETIONARY = {"Shopping", "Entertainment", "Travel"}


def _month_vectors(expenses: List[ExpenseItem]):
    totals: Dict[str, float] = {}
    shares: Dict[str, Dict[str, float]] = {}
    wants: Dict[str, float] = {}
    for item in expenses:
        key = item.date[:7]
        totals[key] = totals.get(key, 0.0) + float(item.amount)
        bucket = shares.setdefault(key, {})
        bucket[item.category] = bucket.get(item.category, 0.0) + float(item.amount)
        if item.transactionType == "WANT":
            wants[key] = wants.get(key, 0.0) + float(item.amount)
    months = sorted(totals)
    rows = []
    for month in months:
        total = totals[month] or 1.0
        vector = [shares[month].get(category, 0.0) / total for category in CATEGORIES]
        vector.append(wants.get(month, 0.0) / total)
        rows.append(vector)
    return months, totals, shares, wants, np.array(rows, dtype=float)


def analyze_behavior(expenses: List[ExpenseItem]) -> dict:
    months, totals, shares, wants, matrix = _month_vectors(expenses)
    if len(months) < 3:
        raise ValueError("Add expenses in at least 3 different months before building a spending profile.")

    cluster_count = min(3, len(months))
    model = KMeans(n_clusters=cluster_count, n_init=10, random_state=42)
    labels = model.fit_predict(matrix)
    latest = int(labels[-1])
    center = model.cluster_centers_[latest]
    category_center = center[:-1]
    top_index = int(np.argmax(category_center))
    top_category = CATEGORIES[top_index]
    want_share = float(center[-1])
    if top_category in DISCRETIONARY or want_share >= 0.35:
        profile = f"Discretionary, led by {top_category}"
    elif top_category in {"Rent", "Bills", "Utilities"}:
        profile = f"Fixed-cost, led by {top_category}"
    else:
        profile = f"{top_category}-heavy"

    latest_month = months[-1]
    latest_total = totals[latest_month]
    top_amount = shares[latest_month].get(top_category, 0.0)
    if top_category in DISCRETIONARY:
        intervention = f"Cap {top_category} by about 10% next month (around Rs. {round(top_amount * 0.1):,})."
    else:
        intervention = f"Set aside 5% of {latest_month} spending (Rs. {round(latest_total * 0.05):,}) toward a savings goal."

    silhouette = None
    if cluster_count > 1 and len(months) > cluster_count:
        silhouette = round(float(silhouette_score(matrix, labels)), 3)

    history = []
    for index, month in enumerate(months):
        history.append(
            {
                "month": month,
                "total": round(totals[month], 2),
                "cluster": int(labels[index]),
                "wantShare": round(wants.get(month, 0.0) / (totals[month] or 1), 3),
            }
        )

    return {
        "status": "success",
        "model": "K-means on monthly category shares",
        "profile": profile,
        "topCategory": top_category,
        "wantShare": round(want_share, 3),
        "cluster": latest,
        "clusterCount": cluster_count,
        "silhouette": silhouette,
        "intervention": intervention,
        "months": history,
    }
