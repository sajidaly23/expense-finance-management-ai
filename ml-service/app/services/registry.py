from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Dict, List

from app.utils.config import settings

MODEL_FILES = {
    "linear_regression.pkl": "LinearRegression",
    "random_forest.pkl": "RandomForestRegressor",
    "xgboost.pkl": "XGBoostRegressor",
    "isolation_forest.pkl": "IsolationForest",
}

DISPLAY_TO_FILE = {
    "Linear Regression": "linear_regression.pkl",
    "Random Forest Regressor": "random_forest.pkl",
    "XGBoost Regressor": "xgboost.pkl",
}


def model_root() -> Path:
    root = Path(settings.MODEL_DIR)
    if not root.is_absolute():
        root = Path(__file__).resolve().parents[2] / root
    root.mkdir(parents=True, exist_ok=True)
    return root


def safe_user_id(user_id: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9]", "", user_id or "")
    if not cleaned:
        raise ValueError("A valid userId is required.")
    return cleaned[:64]


def user_dir(user_id: str) -> Path:
    path = model_root() / safe_user_id(user_id)
    path.mkdir(parents=True, exist_ok=True)
    return path


def list_saved_model_types() -> List[str]:
    found = set()
    root = model_root()
    for dirpath, _dirnames, filenames in os.walk(root):
        for filename in filenames:
            label = MODEL_FILES.get(filename)
            if label:
                found.add(label)
    return sorted(found)
