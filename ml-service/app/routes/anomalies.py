from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.schemas import AnomalyRequest
from app.services.anomaly import detect_anomalies

router = APIRouter(tags=["Anomalies"])


@router.post("/anomalies")
def anomalies(payload: AnomalyRequest):
    try:
        return detect_anomalies(payload.userId, payload.expenses)
    except ValueError as err:
        return JSONResponse({"status": "error", "message": str(err)}, status_code=400)
    except Exception as err:
        return JSONResponse({"status": "error", "message": f"Anomaly scan failed: {err}"}, status_code=500)
