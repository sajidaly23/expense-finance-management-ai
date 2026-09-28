from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.schemas import TrainRequest
from app.services.forecast import train_forecast

router = APIRouter(tags=["Train"])


@router.post("/train")
def train(payload: TrainRequest):
    try:
        result = train_forecast(payload.userId, payload.expenses, payload.incomes)
        return result
    except ValueError as err:
        return JSONResponse({"status": "error", "message": str(err)}, status_code=400)
    except Exception as err:
        return JSONResponse({"status": "error", "message": f"Training failed: {err}"}, status_code=500)
