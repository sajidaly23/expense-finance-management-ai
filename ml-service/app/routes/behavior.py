from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.schemas import AnomalyRequest
from app.services.behavior import analyze_behavior

router = APIRouter(tags=["Behavior"])


@router.post("/behavior")
def behavior(payload: AnomalyRequest):
    try:
        return analyze_behavior(payload.expenses)
    except ValueError as err:
        return JSONResponse({"status": "error", "message": str(err)}, status_code=400)
    except Exception as err:
        return JSONResponse({"status": "error", "message": f"Behavior analysis failed: {err}"}, status_code=500)
