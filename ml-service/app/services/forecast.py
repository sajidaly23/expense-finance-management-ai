from __future__ import annotations

import json
from typing import Any, Dict, List

import joblib
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from app.schemas import ExpenseItem, IncomeItem
from app.services.features import (
    FEATURE_COLUMNS,
    design_matrix,
    monthly_frames,
    next_period_label,
    predict_feature_rows,
)
from app.services.registry import DISPLAY_TO_FILE, user_dir

try:
    from xgboost import XGBRegressor
except Exception as err:  # pragma: no cover - optional at import time
    XGBRegressor = None
    print(f"XGBoost is unavailable ({err}). Training Linear Regression and Random Forest only.")


def _mape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    mask = y_true != 0
    if not np.any(mask):
        return 0.0
    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100)


def _metrics(name: str, y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, Any]:
    r2 = r2_score(y_true, y_pred) if len(y_true) >= 2 else 0.0
    if np.isnan(r2):
        r2 = 0.0
    return {
        "name": name,
        "mae": round(float(mean_absolute_error(y_true, y_pred)), 2),
        "rmse": round(float(np.sqrt(mean_squared_error(y_true, y_pred))), 2),
        "mape": round(_mape(y_true, y_pred), 2),
        "r2": round(float(r2), 4),
    }


def _estimators() -> List[tuple]:
    models = [
        (
            "Linear Regression",
            Pipeline([("scaler", StandardScaler()), ("model", LinearRegression())]),
        ),
        (
            "Random Forest Regressor",
            RandomForestRegressor(n_estimators=80, max_depth=6, random_state=42),
        ),
    ]
    if XGBRegressor is not None:
        models.append(
            (
                "XGBoost Regressor",
                XGBRegressor(
                    n_estimators=80,
                    max_depth=4,
                    learning_rate=0.1,
                    subsample=0.9,
                    colsample_bytree=0.9,
                    objective="reg:squarederror",
                    random_state=42,
                    n_jobs=1,
                ),
            )
        )
    return models


def train_forecast(user_id: str, expenses: List[ExpenseItem], incomes: List[IncomeItem]) -> Dict[str, Any]:
    bundle = monthly_frames(expenses, incomes)
    x_train, y_train = design_matrix(bundle["train"])
    x_test, y_test = design_matrix(bundle["test"])
    directory = user_dir(user_id)

    results = []
    for name, estimator in _estimators():
        estimator.fit(x_train, y_train)
        pred = np.clip(estimator.predict(x_test), 0, None)
        metrics = _metrics(name, y_test, pred)
        filename = DISPLAY_TO_FILE[name]
        joblib.dump({"model": estimator, "features": FEATURE_COLUMNS}, directory / filename)
        results.append(metrics)

    if not results:
        raise ValueError("No forecast models could be trained.")

    best = min(results, key=lambda item: item["mae"])
    meta = {
        "bestModel": best["name"],
        "features": FEATURE_COLUMNS,
        "usedCategories": bundle["used_categories"],
        "lastMonth": bundle["last_month"],
        "monthsUsed": len(bundle["months"]),
        "models": results,
    }
    (directory / "meta.json").write_text(json.dumps(meta, indent=2))
    try:
        from app.services.anomaly import detect_anomalies

        detect_anomalies(user_id, expenses)
    except ValueError:
        pass

    return {
        "status": "success",
        "monthsUsed": len(bundle["months"]),
        "holdoutMonth": bundle["last_month"],
        "models": results,
        "bestModel": best["name"],
        "saved": [DISPLAY_TO_FILE[item["name"]] for item in results],
    }


def _load_estimator(user_id: str, display_name: str):
    directory = user_dir(user_id)
    path = directory / DISPLAY_TO_FILE[display_name]
    if not path.exists():
        raise FileNotFoundError(f"No saved {display_name} model. Train first.")
    payload = joblib.load(path)
    return payload["model"]


def predict_forecast(user_id: str, expenses: List[ExpenseItem], incomes: List[IncomeItem]) -> Dict[str, Any]:
    directory = user_dir(user_id)
    meta_path = directory / "meta.json"
    if not meta_path.exists():
        raise FileNotFoundError("No trained forecast for this user. Train first.")

    meta = json.loads(meta_path.read_text())
    bundle = monthly_frames(expenses, incomes)
    feature_rows = predict_feature_rows(
        bundle["last_month"],
        bundle["used_categories"],
        bundle["cat_month"],
        bundle["month_total"],
        bundle["income_month"],
        bundle["txn_month"],
        bundle["months"],
    )
    x_next = feature_rows[FEATURE_COLUMNS].to_numpy(dtype=float)
    previous_total = float(bundle["month_total"].get(bundle["last_month"], 0.0))

    model_outputs = []
    for item in meta.get("models", []):
        name = item["name"]
        try:
            estimator = _load_estimator(user_id, name)
        except FileNotFoundError:
            continue
        preds = np.clip(estimator.predict(x_next), 0, None)
        categories = []
        for category, amount in zip(feature_rows["category"].tolist(), preds.tolist()):
            previous = float(bundle["cat_month"].get((bundle["last_month"], category), 0.0))
            categories.append(
                {
                    "category": category,
                    "predictedAmount": round(float(amount), 2),
                    "previousAmount": round(previous, 2),
                }
            )
        predicted_total = round(float(np.sum(preds)), 2)
        model_outputs.append(
            {
                **item,
                "predictedAmount": predicted_total,
                "categoryPredictions": categories,
            }
        )

    if not model_outputs:
        raise FileNotFoundError("No saved forecast models. Train first.")

    best_name = meta.get("bestModel") or min(model_outputs, key=lambda row: row["mae"])["name"]
    best = next((row for row in model_outputs if row["name"] == best_name), model_outputs[0])
    change = round(best["predictedAmount"] - previous_total, 2)
    change_pct = 0.0 if previous_total == 0 else round((change / previous_total) * 100, 1)

    return {
        "status": "success",
        "predictionPeriod": next_period_label(bundle["last_month"]),
        "previousMonthExpense": round(previous_total, 2),
        "predictedAmount": best["predictedAmount"],
        "changeAmount": change,
        "changePercentage": change_pct,
        "bestModel": best["name"],
        "modelMetrics": {
            "name": best["name"],
            "mae": best["mae"],
            "rmse": best["rmse"],
            "mape": best["mape"],
            "r2": best["r2"],
        },
        "models": model_outputs,
        "monthsUsed": len(bundle["months"]),
        "categoryPredictions": best["categoryPredictions"],
    }
