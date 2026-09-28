from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from typing import Dict, Iterable, List, Tuple

import numpy as np
import pandas as pd

from app.schemas import ExpenseItem, IncomeItem

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
FEATURE_COLUMNS = [
    "month_num",
    "month_index",
    "category_code",
    "lag1",
    "lag2",
    "month_total_lag1",
    "income_lag1",
    "txn_count_lag1",
]


def month_key(value: str) -> str:
    return value[:7]


def shift_month(key: str, delta: int) -> str:
    year, month = [int(part) for part in key.split("-")]
    month += delta
    while month > 12:
        month -= 12
        year += 1
    while month < 1:
        month += 12
        year -= 1
    return f"{year:04d}-{month:02d}"


def month_range(start: str, end: str) -> List[str]:
    keys = []
    current = start
    while current <= end:
        keys.append(current)
        current = shift_month(current, 1)
    return keys


def next_period_label(month: str) -> str:
    nxt = shift_month(month, 1)
    date = datetime.strptime(f"{nxt}-01", "%Y-%m-%d")
    return date.strftime("%B %Y")


def category_code(name: str) -> int:
    return CATEGORY_INDEX.get(name if name in CATEGORY_INDEX else "Other", CATEGORY_INDEX["Other"])


def monthly_frames(expenses: Iterable[ExpenseItem], incomes: Iterable[IncomeItem]):
    expense_rows = list(expenses)
    if not expense_rows:
        raise ValueError("No expenses were provided.")

    keys = sorted({month_key(item.date) for item in expense_rows})
    if len(keys) < 3:
        raise ValueError("Need at least 3 months of expenses to train a forecast model.")

    months = month_range(keys[0], keys[-1])
    used_categories = sorted({item.category if item.category in CATEGORY_INDEX else "Other" for item in expense_rows})

    cat_month = defaultdict(float)
    txn_month = defaultdict(int)
    month_total = defaultdict(float)
    income_month = defaultdict(float)

    for item in expense_rows:
        key = month_key(item.date)
        cat = item.category if item.category in CATEGORY_INDEX else "Other"
        cat_month[(key, cat)] += float(item.amount)
        txn_month[key] += 1
        month_total[key] += float(item.amount)

    for item in incomes:
        income_month[month_key(item.date)] += float(item.amount)

    rows = []
    for index, month in enumerate(months):
        prev1 = shift_month(month, -1)
        prev2 = shift_month(month, -2)
        for category in used_categories:
            rows.append(
                {
                    "month": month,
                    "month_index": index,
                    "month_num": int(month.split("-")[1]),
                    "category": category,
                    "category_code": category_code(category),
                    "amount": cat_month.get((month, category), 0.0),
                    "lag1": cat_month.get((prev1, category), 0.0),
                    "lag2": cat_month.get((prev2, category), 0.0),
                    "month_total_lag1": month_total.get(prev1, 0.0),
                    "income_lag1": income_month.get(prev1, 0.0),
                    "txn_count_lag1": txn_month.get(prev1, 0),
                }
            )

    frame = pd.DataFrame(rows)
    last_month = months[-1]
    train = frame[frame["month"] != last_month]
    test = frame[frame["month"] == last_month]
    if train.empty or test.empty:
        raise ValueError("Not enough monthly history to evaluate a holdout month.")

    return {
        "frame": frame,
        "train": train,
        "test": test,
        "months": months,
        "last_month": last_month,
        "used_categories": used_categories,
        "month_total": dict(month_total),
        "income_month": dict(income_month),
        "txn_month": dict(txn_month),
        "cat_month": dict(cat_month),
    }


def design_matrix(frame: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
    x = frame[FEATURE_COLUMNS].to_numpy(dtype=float)
    y = frame["amount"].to_numpy(dtype=float)
    return x, y


def predict_feature_rows(
    last_month: str,
    used_categories: List[str],
    cat_month: Dict,
    month_total: Dict,
    income_month: Dict,
    txn_month: Dict,
    months: List[str],
) -> pd.DataFrame:
    target = shift_month(last_month, 1)
    prev1 = last_month
    prev2 = shift_month(last_month, -1)
    month_index = len(months)
    rows = []
    for category in used_categories:
        rows.append(
            {
                "month": target,
                "month_index": month_index,
                "month_num": int(target.split("-")[1]),
                "category": category,
                "category_code": category_code(category),
                "lag1": cat_month.get((prev1, category), 0.0),
                "lag2": cat_month.get((prev2, category), 0.0),
                "month_total_lag1": month_total.get(prev1, 0.0),
                "income_lag1": income_month.get(prev1, 0.0),
                "txn_count_lag1": txn_month.get(prev1, 0),
            }
        )
    return pd.DataFrame(rows)
