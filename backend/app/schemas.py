from __future__ import annotations

from datetime import date, datetime, time
from decimal import Decimal
from typing import Any, Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, Field


T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    code: int = 0
    message: str = "ok"
    data: T


class PageData(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int


class UserProfile(BaseModel):
    id: int
    nickname: str
    avatar_url: str | None = None
    habit_count: int = 0
    total_checkin_count: int = 0
    current_streak_days: int = 0


class LoginRequest(BaseModel):
    login_code: str = Field(min_length=1)
    nickname: str = Field(min_length=1, max_length=64)
    avatar_url: str | None = None


class LoginData(BaseModel):
    token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserProfile


class SchedulePayload(BaseModel):
    repeat_type: Literal["daily", "weekly", "custom"] = "daily"
    weekdays: list[int] = Field(default_factory=lambda: [1, 2, 3, 4, 5, 6, 7])
    remind_time: time | None = None
    deadline_time: time | None = None
    timezone: str = "Asia/Shanghai"


class HabitCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=64)
    category: str = Field(min_length=1, max_length=32)
    description: str | None = Field(default=None, max_length=255)
    frequency_type: Literal["daily", "weekly", "custom"] = "daily"
    goal_times_per_day: int = Field(default=1, ge=1, le=20)
    theme_id: int
    start_date: date
    end_date: date | None = None
    schedule: SchedulePayload


class HabitUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=64)
    category: str | None = Field(default=None, min_length=1, max_length=32)
    description: str | None = Field(default=None, max_length=255)
    goal_times_per_day: int | None = Field(default=None, ge=1, le=20)
    theme_id: int | None = None
    end_date: date | None = None
    schedule: SchedulePayload | None = None


class HabitStatusRequest(BaseModel):
    status: Literal["active", "paused", "archived"]


class HabitCard(BaseModel):
    id: int
    name: str
    category: str
    description: str | None = None
    frequency_type: Literal["daily", "weekly", "custom"]
    goal_times_per_day: int
    theme_id: int
    theme_name: str
    start_date: date
    end_date: date | None = None
    habit_status: Literal["active", "paused", "archived"]
    schedule: SchedulePayload
    progress_percent: Decimal = Decimal("0.00")
    current_layer_count: int = 0
    growth_status: Literal["growing", "paused", "completed"] = "growing"


class DayRecord(BaseModel):
    date: date
    status: Literal["pending", "completed", "missed", "skipped"]
    dark_level: int = 0
    checkin_count: int = 0


class HabitDetail(HabitCard):
    today_record: DayRecord


class HabitCalendarResponse(BaseModel):
    habit_id: int
    year_month: str
    days: list[DayRecord]


class CheckinCreateRequest(BaseModel):
    habit_id: int
    checkin_at: datetime
    note: str | None = Field(default=None, max_length=500)
    proof_media_id: int | None = None


class RepairCheckinRequest(BaseModel):
    habit_id: int
    record_date: date
    reason: str | None = Field(default=None, max_length=255)
    proof_media_id: int | None = None


class LayerView(BaseModel):
    id: int
    layer_no: int
    image_url: str
    render_state: Literal["normal", "dark"]
    x: float
    y: float
    z_index: int
    generated_at: datetime


class GrowthStateView(BaseModel):
    current_layer_count: int
    lit_layer_count: int
    dark_layer_count: int
    progress_percent: Decimal
    growth_status: Literal["growing", "paused", "completed"]
    current_preview_url: str | None = None
    last_grow_at: datetime | None = None


class CheckinResult(BaseModel):
    checkin_id: int
    day_record: DayRecord
    new_layer: LayerView
    growth_state: GrowthStateView


class CheckinItem(BaseModel):
    id: int
    habit_id: int
    checkin_at: datetime
    note: str | None = None
    proof_media_id: int | None = None


class ThemeCard(BaseModel):
    id: int
    name: str
    theme_type: str
    total_layers: int
    preview_url: str


class ThemeDetail(ThemeCard):
    config: dict[str, Any] = Field(default_factory=dict)


class GrowthStateResponse(BaseModel):
    habit_id: int
    theme: ThemeCard
    current_layer_count: int
    lit_layer_count: int
    dark_layer_count: int
    progress_percent: Decimal
    growth_status: Literal["growing", "paused", "completed"]
    current_preview_url: str | None = None
    last_grow_at: datetime | None = None


class TimelineItem(BaseModel):
    checkin_id: int
    checkin_at: datetime
    note: str | None = None
    layer: LayerView


class PreviewResponse(BaseModel):
    habit_id: int
    preview_url: str | None = None
    updated_at: datetime | None = None


class MediaUploadTokenRequest(BaseModel):
    filename: str
    content_type: str


class MediaUploadTokenData(BaseModel):
    upload_url: str
    object_key: str
    expire_at: datetime


class MediaAssetCreateRequest(BaseModel):
    storage_type: Literal["oss", "cos", "s3", "local", "cdn"] = "oss"
    bucket: str
    object_key: str
    file_url: str
    mime_type: str
    width: int | None = None
    height: int | None = None
    size_bytes: int | None = None
    file_hash: str | None = None


class MediaAssetResponse(BaseModel):
    media_id: int
    file_url: str


class HomeHabitItem(BaseModel):
    habit_id: int
    habit_name: str
    category: str
    today_status: Literal["pending", "completed", "missed", "skipped"]
    progress_percent: Decimal


class HomePageData(BaseModel):
    user: UserProfile
    today_habits: list[HomeHabitItem]
    completed_count: int
    pending_count: int
    featured_growth: PreviewResponse | None = None


class ErrorResponse(BaseModel):
    model_config = ConfigDict(json_schema_extra={"example": {"detail": "Habit not found"}})
    detail: str
