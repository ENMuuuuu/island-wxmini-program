from __future__ import annotations

from datetime import date, datetime, time
from decimal import Decimal

from sqlalchemy import JSON, Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class AppUser(TimestampMixin, Base):
    __tablename__ = "app_user"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nickname: Mapped[str] = mapped_column(String(64))
    avatar_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)

    habits: Mapped[list["Habit"]] = relationship(back_populates="user")


class MediaAsset(TimestampMixin, Base):
    __tablename__ = "media_asset"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    storage_type: Mapped[str] = mapped_column(String(16), default="oss")
    bucket: Mapped[str] = mapped_column(String(128))
    object_key: Mapped[str] = mapped_column(String(512))
    file_url: Mapped[str] = mapped_column(String(1024))
    mime_type: Mapped[str] = mapped_column(String(128))
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    file_hash: Mapped[str | None] = mapped_column(String(128), unique=True, nullable=True)


class GrowthTheme(TimestampMixin, Base):
    __tablename__ = "growth_theme"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(64))
    theme_type: Mapped[str] = mapped_column(String(32))
    total_layers: Mapped[int] = mapped_column(Integer, default=0)
    preview_url: Mapped[str] = mapped_column(String(1024))
    config_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    theme_status: Mapped[str] = mapped_column(String(16), default="active")

    habits: Mapped[list["Habit"]] = relationship(back_populates="theme")


class Habit(TimestampMixin, Base):
    __tablename__ = "habit"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("app_user.id"), index=True)
    name: Mapped[str] = mapped_column(String(64))
    category: Mapped[str] = mapped_column(String(32))
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    frequency_type: Mapped[str] = mapped_column(String(16), default="daily")
    goal_times_per_day: Mapped[int] = mapped_column(Integer, default=1)
    theme_id: Mapped[int] = mapped_column(ForeignKey("growth_theme.id"), index=True)
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    habit_status: Mapped[str] = mapped_column(String(16), default="active")

    user: Mapped[AppUser] = relationship(back_populates="habits")
    theme: Mapped[GrowthTheme] = relationship(back_populates="habits")
    schedule: Mapped["HabitSchedule"] = relationship(
        back_populates="habit", uselist=False, cascade="all, delete-orphan"
    )
    day_records: Mapped[list["HabitDayRecord"]] = relationship(
        back_populates="habit", cascade="all, delete-orphan"
    )
    checkins: Mapped[list["HabitCheckin"]] = relationship(
        back_populates="habit", cascade="all, delete-orphan"
    )
    growth_layers: Mapped[list["HabitGrowthLayer"]] = relationship(
        back_populates="habit", cascade="all, delete-orphan"
    )
    growth_state: Mapped["HabitGrowthState"] = relationship(
        back_populates="habit", uselist=False, cascade="all, delete-orphan"
    )


class HabitSchedule(TimestampMixin, Base):
    __tablename__ = "habit_schedule"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    habit_id: Mapped[int] = mapped_column(ForeignKey("habit.id"), unique=True)
    repeat_type: Mapped[str] = mapped_column(String(16), default="daily")
    weekdays_json: Mapped[list[int] | None] = mapped_column(JSON, nullable=True)
    remind_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    deadline_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    timezone: Mapped[str] = mapped_column(String(64), default="Asia/Shanghai")

    habit: Mapped[Habit] = relationship(back_populates="schedule")


class HabitDayRecord(TimestampMixin, Base):
    __tablename__ = "habit_day_record"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    habit_id: Mapped[int] = mapped_column(ForeignKey("habit.id"), index=True)
    record_date: Mapped[date] = mapped_column(Date, index=True)
    record_status: Mapped[str] = mapped_column(String(16), default="pending")
    should_checkin: Mapped[bool] = mapped_column(Boolean, default=True)
    checkin_count: Mapped[int] = mapped_column(Integer, default=0)
    is_late: Mapped[bool] = mapped_column(Boolean, default=False)
    pause_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    dark_level: Mapped[int] = mapped_column(Integer, default=0)

    habit: Mapped[Habit] = relationship(back_populates="day_records")
    checkins: Mapped[list["HabitCheckin"]] = relationship(
        back_populates="day_record", cascade="all, delete-orphan"
    )


class HabitCheckin(TimestampMixin, Base):
    __tablename__ = "habit_checkin"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    habit_id: Mapped[int] = mapped_column(ForeignKey("habit.id"), index=True)
    day_record_id: Mapped[int] = mapped_column(ForeignKey("habit_day_record.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("app_user.id"), index=True)
    checkin_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    proof_media_id: Mapped[int | None] = mapped_column(
        ForeignKey("media_asset.id"), nullable=True
    )
    checkin_source: Mapped[str] = mapped_column(String(16), default="manual")

    habit: Mapped[Habit] = relationship(back_populates="checkins")
    day_record: Mapped[HabitDayRecord] = relationship(back_populates="checkins")


class HabitGrowthLayer(TimestampMixin, Base):
    __tablename__ = "habit_growth_layer"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    habit_id: Mapped[int] = mapped_column(ForeignKey("habit.id"), index=True)
    checkin_id: Mapped[int] = mapped_column(
        ForeignKey("habit_checkin.id"), unique=True, index=True
    )
    layer_no: Mapped[int] = mapped_column(Integer)
    image_url: Mapped[str] = mapped_column(String(1024))
    render_state: Mapped[str] = mapped_column(String(16), default="normal")
    pos_x: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    pos_y: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    z_index: Mapped[int] = mapped_column(Integer, default=0)
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    habit: Mapped[Habit] = relationship(back_populates="growth_layers")


class HabitGrowthState(TimestampMixin, Base):
    __tablename__ = "habit_growth_state"

    habit_id: Mapped[int] = mapped_column(ForeignKey("habit.id"), primary_key=True)
    current_layer_count: Mapped[int] = mapped_column(Integer, default=0)
    lit_layer_count: Mapped[int] = mapped_column(Integer, default=0)
    dark_layer_count: Mapped[int] = mapped_column(Integer, default=0)
    progress_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0.00"))
    growth_status: Mapped[str] = mapped_column(String(16), default="growing")
    current_preview_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    last_grow_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    habit: Mapped[Habit] = relationship(back_populates="growth_state")
