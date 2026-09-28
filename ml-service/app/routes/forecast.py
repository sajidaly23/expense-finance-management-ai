from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.schemas import PredictRequest
from app.services.intervals import forecast_intervals

router = APIRouter(tags=["Forecast intervals"])


@router.post("/forecast-intervals")
def intervals(payload: PredictRequest):
    try:
        return forecast_intervals(payload.expenses)
    except ValueError as err:
        return JSONResponse({"status": "error", "message": str(err)}, status_code=400)
    except Exception as err:
        return JSONResponse({"status": "error", "message": f"Interval forecast failed: {err}"}, status_code=500)
