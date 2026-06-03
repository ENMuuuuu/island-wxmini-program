from __future__ import annotations

import time
from contextlib import asynccontextmanager

from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from fastapi import FastAPI

from app.api import api_router
from app.core.config import settings
from app.database import Base, SessionLocal, engine
from app.models import AppUser  # noqa: F401
from app.store import store


@asynccontextmanager
async def lifespan(_: FastAPI):
    for _attempt in range(10):
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            break
        except OperationalError:
            time.sleep(2)
    else:
        raise RuntimeError("Database is not ready, please check Docker MySQL status.")

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        store.seed_themes(db)
        store.seed_test_user(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="帮助用户坚持好习惯的后端 API，已接入 Docker MySQL。",
    lifespan=lifespan,
)


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "message": "Habit Growth API is running",
        "docs": "/docs",
    }


app.include_router(api_router)
