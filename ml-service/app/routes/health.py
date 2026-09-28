from datetime import datetime
import sys

from fastapi import APIRouter

from app.services.registry import list_saved_model_types

router = APIRouter(tags=["Health"])


@router.get("/health")
def health_check():
    models = list_saved_model_types()
    return {
        "status": "healthy",
        "service": "SmartFin AI Python ML Service",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "python_version": sys.version.split()[0],
        "models_available": models,
        "train": "/train",
        "predict": "/predict",
        "anomalies": "/anomalies",
    }
