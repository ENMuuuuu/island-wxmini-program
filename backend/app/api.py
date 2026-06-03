from __future__ import annotations

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user_id
from app.schemas import (
    APIResponse,
    CheckinCreateRequest,
    CheckinItem,
    CheckinNoteResponse,
    CheckinResult,
    GrowthStateResponse,
    HabitCalendarResponse,
    HabitCreateRequest,
    HabitDetail,
    HabitStatusRequest,
    HabitUpdateRequest,
    HomePageData,
    LayerView,
    LoginData,
    LoginRequest,
    MediaAssetCreateRequest,
    MediaAssetResponse,
    MediaUploadTokenData,
    MediaUploadTokenRequest,
    PreviewResponse,
    RepairCheckinRequest,
    RepairLayerResult,
    ThemeCard,
    ThemeDetail,
    TimelineItem,
    UpdateCheckinNoteRequest,
    UserProfile,
)
from app.store import store


api_router = APIRouter(prefix="/api/v1")
CurrentUser = Annotated[int, Depends(get_current_user_id)]
DbSession = Annotated[Session, Depends(get_db)]


class UserProfileUpdateRequest(BaseModel):
    nickname: str | None = Field(default=None, max_length=64)
    avatar_url: str | None = None
    bio: str | None = Field(default=None, max_length=200)
    birthday: date | None = None


@api_router.post("/auth/login", response_model=APIResponse[LoginData], tags=["认证"])
async def login(payload: LoginRequest, db: DbSession) -> APIResponse[LoginData]:
    return APIResponse(data=store.login(db, payload))


@api_router.get("/auth/me", response_model=APIResponse[UserProfile], tags=["认证"])
async def get_me(user_id: CurrentUser, db: DbSession) -> APIResponse[UserProfile]:
    return APIResponse(data=store.get_user_profile(db, user_id))


@api_router.get("/users/me/profile", response_model=APIResponse[UserProfile], tags=["用户"])
async def get_profile(user_id: CurrentUser, db: DbSession) -> APIResponse[UserProfile]:
    return APIResponse(data=store.get_user_profile(db, user_id))


@api_router.put("/users/me/profile", response_model=APIResponse[UserProfile], tags=["用户"])
async def update_profile(
    payload: UserProfileUpdateRequest, user_id: CurrentUser, db: DbSession
) -> APIResponse[UserProfile]:
    return APIResponse(
        data=store.update_user_profile(
            db, user_id, payload.nickname, payload.avatar_url, payload.bio, payload.birthday
        )
    )


@api_router.get("/users/me/home", response_model=APIResponse[HomePageData], tags=["用户"])
async def get_home(user_id: CurrentUser, db: DbSession) -> APIResponse[HomePageData]:
    return APIResponse(data=store.get_home(db, user_id))


@api_router.get("/growth/themes", response_model=APIResponse[list[ThemeCard]], tags=["成长"])
async def list_themes(db: DbSession) -> APIResponse[list[ThemeCard]]:
    return APIResponse(data=store.list_themes(db))


@api_router.get(
    "/growth/themes/{theme_id}",
    response_model=APIResponse[ThemeDetail],
    tags=["成长"],
)
async def get_theme(theme_id: int, db: DbSession) -> APIResponse[ThemeDetail]:
    return APIResponse(data=store.get_theme(db, theme_id))


@api_router.post("/habits", response_model=APIResponse[HabitDetail], tags=["习惯"])
async def create_habit(
    payload: HabitCreateRequest, user_id: CurrentUser, db: DbSession
) -> APIResponse[HabitDetail]:
    return APIResponse(data=store.create_habit(db, user_id, payload))


@api_router.get("/habits", response_model=APIResponse[list[HabitDetail]], tags=["习惯"])
async def list_habits(
    user_id: CurrentUser,
    db: DbSession,
    status: str | None = Query(default=None, alias="status"),
) -> APIResponse[list[HabitDetail]]:
    return APIResponse(data=store.list_habits(db, user_id, status))


@api_router.get("/habits/{habit_id}", response_model=APIResponse[HabitDetail], tags=["习惯"])
async def get_habit(habit_id: int, user_id: CurrentUser, db: DbSession) -> APIResponse[HabitDetail]:
    return APIResponse(data=store.get_habit(db, user_id, habit_id))


@api_router.put("/habits/{habit_id}", response_model=APIResponse[HabitDetail], tags=["习惯"])
async def update_habit(
    habit_id: int, payload: HabitUpdateRequest, user_id: CurrentUser, db: DbSession
) -> APIResponse[HabitDetail]:
    return APIResponse(data=store.update_habit(db, user_id, habit_id, payload))


@api_router.patch(
    "/habits/{habit_id}/status",
    response_model=APIResponse[HabitDetail],
    tags=["习惯"],
)
async def update_habit_status(
    habit_id: int, payload: HabitStatusRequest, user_id: CurrentUser, db: DbSession
) -> APIResponse[HabitDetail]:
    return APIResponse(data=store.update_habit_status(db, user_id, habit_id, payload))


@api_router.get(
    "/habits/{habit_id}/calendar",
    response_model=APIResponse[HabitCalendarResponse],
    tags=["习惯"],
)
async def get_habit_calendar(
    habit_id: int,
    user_id: CurrentUser,
    db: DbSession,
    year_month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
) -> APIResponse[HabitCalendarResponse]:
    return APIResponse(data=store.get_calendar(db, user_id, habit_id, year_month))


@api_router.post("/checkins", response_model=APIResponse[CheckinResult], tags=["打卡"])
async def create_checkin(
    payload: CheckinCreateRequest, user_id: CurrentUser, db: DbSession
) -> APIResponse[CheckinResult]:
    return APIResponse(data=store.create_checkin(db, user_id, payload))


@api_router.get("/checkins", response_model=APIResponse[list[CheckinItem]], tags=["打卡"])
async def list_checkins(
    user_id: CurrentUser, db: DbSession, habit_id: int | None = Query(default=None)
) -> APIResponse[list[CheckinItem]]:
    return APIResponse(data=store.list_checkins(db, user_id, habit_id))


@api_router.patch(
    "/checkins/{checkin_id}/note",
    response_model=APIResponse[CheckinNoteResponse],
    tags=["打卡"],
)
async def update_checkin_note(
    checkin_id: int, payload: UpdateCheckinNoteRequest, user_id: CurrentUser, db: DbSession
) -> APIResponse[CheckinNoteResponse]:
    return APIResponse(data=store.update_checkin_note(db, user_id, checkin_id, payload))


@api_router.post(
    "/checkins/repair",
    response_model=APIResponse[CheckinResult],
    tags=["打卡"],
)
async def repair_checkin(
    payload: RepairCheckinRequest, user_id: CurrentUser, db: DbSession
) -> APIResponse[CheckinResult]:
    return APIResponse(data=store.repair_checkin(db, user_id, payload))


@api_router.get(
    "/growth/habits/{habit_id}/state",
    response_model=APIResponse[GrowthStateResponse],
    tags=["成长"],
)
async def get_growth_state(
    habit_id: int, user_id: CurrentUser, db: DbSession
) -> APIResponse[GrowthStateResponse]:
    return APIResponse(data=store.get_growth_state(db, user_id, habit_id))


@api_router.get(
    "/growth/habits/{habit_id}/layers",
    response_model=APIResponse[list[LayerView]],
    tags=["成长"],
)
async def list_growth_layers(
    habit_id: int, user_id: CurrentUser, db: DbSession
) -> APIResponse[list[LayerView]]:
    return APIResponse(data=store.list_layers(db, user_id, habit_id))


@api_router.get(
    "/growth/habits/{habit_id}/timeline",
    response_model=APIResponse[list[TimelineItem]],
    tags=["成长"],
)
async def get_growth_timeline(
    habit_id: int, user_id: CurrentUser, db: DbSession
) -> APIResponse[list[TimelineItem]]:
    return APIResponse(data=store.get_timeline(db, user_id, habit_id))


@api_router.get(
    "/growth/habits/{habit_id}/preview",
    response_model=APIResponse[PreviewResponse],
    tags=["成长"],
)
async def get_growth_preview(
    habit_id: int, user_id: CurrentUser, db: DbSession
) -> APIResponse[PreviewResponse]:
    return APIResponse(data=store.get_preview(db, user_id, habit_id))


@api_router.post(
    "/growth/habits/{habit_id}/repair",
    response_model=APIResponse[RepairLayerResult],
    tags=["成长"],
)
async def repair_growth_layer(
    habit_id: int, user_id: CurrentUser, db: DbSession
) -> APIResponse[RepairLayerResult]:
    return APIResponse(data=store.repair_growth_layer(db, user_id, habit_id))


@api_router.post(
    "/media/upload-token",
    response_model=APIResponse[MediaUploadTokenData],
    tags=["媒体"],
)
async def create_upload_token(
    payload: MediaUploadTokenRequest, user_id: CurrentUser
) -> APIResponse[MediaUploadTokenData]:
    del user_id
    return APIResponse(data=store.create_upload_token(payload.filename))


@api_router.post(
    "/media/assets",
    response_model=APIResponse[MediaAssetResponse],
    tags=["媒体"],
)
async def create_media_asset(
    payload: MediaAssetCreateRequest, user_id: CurrentUser, db: DbSession
) -> APIResponse[MediaAssetResponse]:
    del user_id
    return APIResponse(data=store.create_media_asset(db, payload))
