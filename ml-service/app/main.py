from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.routes import health, train, predict, anomalies, forecast, behavior
from app.utils.config import settings

app = FastAPI(
    title="SmartFin AI - Machine Learning Microservice",
    description="Trains expense forecasts, returns next-month predictions, and flags unusual spend.",
    version="1.0.0",
)

cors_origins = list(
    {
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:5000",
        "http://127.0.0.1:5000",
        settings.BACKEND_URL,
        settings.FRONTEND_URL,
    }
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(train.router)
app.include_router(predict.router)
app.include_router(anomalies.router)
app.include_router(forecast.router)
app.include_router(behavior.router)


@app.get("/")
def root():
    return {
        "message": "Welcome to SmartFin AI Machine Learning Microservice",
        "docs": "/docs",
        "health": "/health",
        "train": "/train",
        "predict": "/predict",
        "anomalies": "/anomalies",
        "forecastIntervals": "/forecast-intervals",
        "behavior": "/behavior",
        "status": "ONLINE",
    }


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=False,
    )
