import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PORT: int = int(os.getenv("PORT", 8000))
    HOST: str = os.getenv("HOST", "0.0.0.0")
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"
    BACKEND_URL: str = os.getenv("BACKEND_URL", "http://localhost:5000")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    MODEL_DIR: str = os.getenv("MODEL_DIR", "trained_models")
    DATASET_DIR: str = os.getenv("DATASET_DIR", "datasets")

settings = Settings()
