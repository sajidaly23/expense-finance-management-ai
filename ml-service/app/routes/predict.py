from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.schemas import PredictRequest
from app.services.forecast import predict_forecast

router = APIRouter(tags=["Predict"])


@router.post("/predict")
def predict(payload: PredictRequest):
    try:
        return predict_forecast(payload.userId, payload.expenses, payload.incomes)
    except FileNotFoundError as err:
        return JSONResponse({"status": "error", "message": str(err)}, status_code=404)
    except ValueError as err:
        return JSONResponse({"status": "error", "message": str(err)}, status_code=400)
    except Exception as err:
        return JSONResponse({"status": "error", "message": f"Prediction failed: {err}"}, status_code=500)
