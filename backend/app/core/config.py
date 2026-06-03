from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")


class Settings:
    app_name: str = os.getenv("APP_NAME", "Habit Growth API")
    app_env: str = os.getenv("APP_ENV", "development")
    database_url: str = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://habit_user:habit_password@127.0.0.1:3306/habit_app?charset=utf8mb4",
    )
    jwt_secret_key: str = os.getenv(
        "JWT_SECRET_KEY",
        "dev-jwt-secret-change-me-in-production-please",
    )
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    jwt_expire_minutes: int = int(os.getenv("JWT_EXPIRE_MINUTES", "10080"))


settings = Settings()
