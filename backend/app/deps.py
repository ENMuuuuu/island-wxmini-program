from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Header, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.store import store


bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user_id(
    db: Annotated[Session, Depends(get_db)],
    bearer: Annotated[HTTPAuthorizationCredentials | None, Security(bearer_scheme)],
    authorization: str | None = Header(default=None),
) -> int:
    token: str | None = None
    if bearer and bearer.credentials:
        token = bearer.credentials.strip()
    elif authorization:
        auth_value = authorization.strip()
        token = (
            auth_value.removeprefix("Bearer ").strip()
            if auth_value.startswith("Bearer ")
            else auth_value
        )

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header. Use Swagger Authorize or send Authorization header manually.",
        )

    user_id = store.get_user_id_by_token(db, token)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired or invalid. Please login again to get a valid JWT.",
        )

    return user_id
