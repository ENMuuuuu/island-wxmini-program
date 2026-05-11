from __future__ import annotations

from datetime import date, datetime, time, timezone
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.security import create_access_token, decode_access_token
from app.models import (
    AppUser,
    GrowthTheme,
    Habit,
    HabitCheckin,
    HabitDayRecord,
    HabitGrowthLayer,
    HabitGrowthState,
    HabitSchedule,
    MediaAsset,
)
from app.schemas import (
    CheckinCreateRequest,
    CheckinItem,
    CheckinResult,
    DayRecord,
    GrowthStateResponse,
    GrowthStateView,
    HabitCalendarResponse,
    HabitCreateRequest,
    HabitDetail,
    HabitStatusRequest,
    HabitUpdateRequest,
    HomeHabitItem,
    HomePageData,
    LayerView,
    LoginData,
    LoginRequest,
    MediaAssetCreateRequest,
    MediaAssetResponse,
    MediaUploadTokenData,
    PreviewResponse,
    RepairCheckinRequest,
    SchedulePayload,
    ThemeCard,
    ThemeDetail,
    TimelineItem,
    UserProfile,
)


class DatabaseStore:
    def get_user_id_by_token(self, db: Session, token: str) -> int | None:
        user_id = decode_access_token(token)
        return user_id if db.get(AppUser, user_id) else None

    def login(self, db: Session, payload: LoginRequest) -> LoginData:
        user = db.scalar(select(AppUser).where(AppUser.nickname == payload.nickname))
        if user is None:
            user = AppUser(nickname=payload.nickname, avatar_url=payload.avatar_url)
            db.add(user)
            db.commit()
            db.refresh(user)
        elif payload.avatar_url and user.avatar_url != payload.avatar_url:
            user.avatar_url = payload.avatar_url
            db.commit()

        return LoginData(
            token=create_access_token(str(user.id)),
            expires_in=settings.jwt_expire_minutes * 60,
            user=self.get_user_profile(db, user.id),
        )

    def get_user_profile(self, db: Session, user_id: int) -> UserProfile:
        user = db.get(AppUser, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        habit_count = db.scalar(
            select(func.count()).select_from(Habit).where(Habit.user_id == user_id)
        ) or 0
        total_checkin_count = db.scalar(
            select(func.count()).select_from(HabitCheckin).where(HabitCheckin.user_id == user_id)
        ) or 0

        return UserProfile(
            id=user.id,
            nickname=user.nickname,
            avatar_url=user.avatar_url,
            habit_count=habit_count,
            total_checkin_count=total_checkin_count,
            current_streak_days=self._estimate_streak(db, user_id),
        )

    def update_user_profile(
        self, db: Session, user_id: int, nickname: str | None, avatar_url: str | None
    ) -> UserProfile:
        user = db.get(AppUser, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if nickname is not None:
            user.nickname = nickname
        if avatar_url is not None:
            user.avatar_url = avatar_url
        db.commit()
        return self.get_user_profile(db, user_id)

    def get_home(self, db: Session, user_id: int) -> HomePageData:
        user = self.get_user_profile(db, user_id)
        today = date.today()
        habits = db.scalars(
            select(Habit)
            .where(Habit.user_id == user_id, Habit.habit_status != "archived")
            .order_by(Habit.id.desc())
        ).all()
        today_habits: list[HomeHabitItem] = []
        featured: PreviewResponse | None = None

        for habit in habits:
            day_record = self._ensure_day_record(db, habit.id, today)
            state = self._get_growth_state_model(db, habit.id)
            today_habits.append(
                HomeHabitItem(
                    habit_id=habit.id,
                    habit_name=habit.name,
                    category=habit.category,
                    today_status=day_record.record_status,
                    progress_percent=state.progress_percent,
                )
            )
            if featured is None:
                featured = PreviewResponse(
                    habit_id=habit.id,
                    preview_url=state.current_preview_url,
                    updated_at=state.last_grow_at,
                )

        completed_count = sum(1 for item in today_habits if item.today_status == "completed")
        pending_count = sum(1 for item in today_habits if item.today_status == "pending")
        return HomePageData(
            user=user,
            today_habits=today_habits,
            completed_count=completed_count,
            pending_count=pending_count,
            featured_growth=featured,
        )

    def list_themes(self, db: Session) -> list[ThemeCard]:
        themes = db.scalars(
            select(GrowthTheme).where(GrowthTheme.theme_status == "active").order_by(GrowthTheme.id)
        ).all()
        return [
            ThemeCard(
                id=theme.id,
                name=theme.name,
                theme_type=theme.theme_type,
                total_layers=theme.total_layers,
                preview_url=theme.preview_url,
            )
            for theme in themes
        ]

    def get_theme(self, db: Session, theme_id: int) -> ThemeDetail:
        theme = db.get(GrowthTheme, theme_id)
        if not theme:
            raise HTTPException(status_code=404, detail="Theme not found")
        return ThemeDetail(
            id=theme.id,
            name=theme.name,
            theme_type=theme.theme_type,
            total_layers=theme.total_layers,
            preview_url=theme.preview_url,
            config=theme.config_json or {},
        )

    def create_habit(self, db: Session, user_id: int, payload: HabitCreateRequest) -> HabitDetail:
        theme = db.get(GrowthTheme, payload.theme_id)
        if not theme:
            raise HTTPException(status_code=404, detail="Theme not found")

        habit = Habit(
            user_id=user_id,
            name=payload.name,
            category=payload.category,
            description=payload.description,
            frequency_type=payload.frequency_type,
            goal_times_per_day=payload.goal_times_per_day,
            theme_id=payload.theme_id,
            start_date=payload.start_date,
            end_date=payload.end_date,
            habit_status="active",
        )
        db.add(habit)
        db.flush()

        schedule = HabitSchedule(
            habit_id=habit.id,
            repeat_type=payload.schedule.repeat_type,
            weekdays_json=payload.schedule.weekdays,
            remind_time=payload.schedule.remind_time,
            deadline_time=payload.schedule.deadline_time,
            timezone=payload.schedule.timezone,
        )
        db.add(schedule)
        db.add(
            HabitGrowthState(
                habit_id=habit.id,
                current_layer_count=0,
                lit_layer_count=0,
                dark_layer_count=0,
                progress_percent=Decimal("0.00"),
                growth_status="growing",
                current_preview_url=theme.preview_url,
                last_grow_at=None,
            )
        )
        db.commit()
        return self.get_habit(db, user_id, habit.id)

    def list_habits(
        self, db: Session, user_id: int, status_filter: str | None = None
    ) -> list[HabitDetail]:
        query = (
            select(Habit)
            .options(
                joinedload(Habit.schedule),
                joinedload(Habit.theme),
                joinedload(Habit.growth_state),
            )
            .where(Habit.user_id == user_id)
            .order_by(Habit.id.desc())
        )
        if status_filter:
            query = query.where(Habit.habit_status == status_filter)
        habits = db.scalars(query).unique().all()
        return [self._habit_to_detail(db, habit) for habit in habits]

    def get_habit(self, db: Session, user_id: int, habit_id: int) -> HabitDetail:
        habit = self._get_habit_owned_by_user(db, user_id, habit_id)
        return self._habit_to_detail(db, habit)

    def update_habit(
        self, db: Session, user_id: int, habit_id: int, payload: HabitUpdateRequest
    ) -> HabitDetail:
        habit = self._get_habit_owned_by_user(db, user_id, habit_id)
        if payload.theme_id is not None:
            theme = db.get(GrowthTheme, payload.theme_id)
            if not theme:
                raise HTTPException(status_code=404, detail="Theme not found")
            habit.theme_id = payload.theme_id
            state = self._get_growth_state_model(db, habit.id)
            state.current_preview_url = theme.preview_url

        for field in ["name", "category", "description", "goal_times_per_day", "end_date"]:
            value = getattr(payload, field)
            if value is not None:
                setattr(habit, field, value)

        if payload.schedule is not None:
            schedule = habit.schedule or HabitSchedule(habit_id=habit.id)
            schedule.repeat_type = payload.schedule.repeat_type
            schedule.weekdays_json = payload.schedule.weekdays
            schedule.remind_time = payload.schedule.remind_time
            schedule.deadline_time = payload.schedule.deadline_time
            schedule.timezone = payload.schedule.timezone
            db.add(schedule)

        db.commit()
        return self.get_habit(db, user_id, habit_id)

    def update_habit_status(
        self, db: Session, user_id: int, habit_id: int, payload: HabitStatusRequest
    ) -> HabitDetail:
        habit = self._get_habit_owned_by_user(db, user_id, habit_id)
        habit.habit_status = payload.status
        state = self._get_growth_state_model(db, habit_id)
        if payload.status == "paused":
            state.growth_status = "paused"
        elif payload.status == "active":
            state.growth_status = "growing"
        db.commit()
        return self.get_habit(db, user_id, habit_id)

    def get_calendar(
        self, db: Session, user_id: int, habit_id: int, year_month: str
    ) -> HabitCalendarResponse:
        self._get_habit_owned_by_user(db, user_id, habit_id)
        records = db.scalars(
            select(HabitDayRecord)
            .where(HabitDayRecord.habit_id == habit_id)
            .order_by(HabitDayRecord.record_date)
        ).all()
        days = [
            DayRecord(
                date=record.record_date,
                status=record.record_status,
                dark_level=record.dark_level,
                checkin_count=record.checkin_count,
            )
            for record in records
            if record.record_date.strftime("%Y-%m") == year_month
        ]
        return HabitCalendarResponse(habit_id=habit_id, year_month=year_month, days=days)

    def create_checkin(self, db: Session, user_id: int, payload: CheckinCreateRequest) -> CheckinResult:
        habit = self._get_habit_owned_by_user(db, user_id, payload.habit_id)
        if habit.habit_status != "active":
            raise HTTPException(status_code=409, detail="Habit is not active")

        checkin_date = payload.checkin_at.date()
        day_record = self._ensure_day_record(db, payload.habit_id, checkin_date)

        checkin = HabitCheckin(
            habit_id=payload.habit_id,
            day_record_id=day_record.id,
            user_id=user_id,
            checkin_at=payload.checkin_at,
            note=payload.note,
            proof_media_id=payload.proof_media_id,
            checkin_source="manual",
        )
        db.add(checkin)
        db.flush()

        day_record.record_status = "completed"
        day_record.checkin_count += 1
        day_record.dark_level = 0

        layer_no = db.scalar(
            select(func.count()).select_from(HabitGrowthLayer).where(HabitGrowthLayer.habit_id == payload.habit_id)
        ) or 0
        layer_no += 1
        layer = HabitGrowthLayer(
            habit_id=payload.habit_id,
            checkin_id=checkin.id,
            layer_no=layer_no,
            image_url=f"https://example.com/generated/habit-{payload.habit_id}/layer-{layer_no}.png",
            render_state="normal",
            pos_x=Decimal(layer_no * 8),
            pos_y=Decimal(layer_no * 6),
            z_index=layer_no,
            generated_at=payload.checkin_at,
        )
        db.add(layer)

        state = self._get_growth_state_model(db, payload.habit_id)
        state.current_layer_count = layer_no
        state.lit_layer_count = layer_no
        state.dark_layer_count = 0
        total_layers = habit.theme.total_layers if habit.theme else 1
        state.progress_percent = (
            Decimal(layer_no) / Decimal(total_layers) * Decimal("100")
        ).quantize(Decimal("0.01"))
        state.growth_status = "completed" if layer_no >= total_layers else "growing"
        state.current_preview_url = (
            f"https://example.com/generated/habit-{payload.habit_id}/preview-{layer_no}.png"
        )
        state.last_grow_at = payload.checkin_at

        db.commit()

        return CheckinResult(
            checkin_id=checkin.id,
            day_record=DayRecord(
                date=day_record.record_date,
                status=day_record.record_status,
                dark_level=day_record.dark_level,
                checkin_count=day_record.checkin_count,
            ),
            new_layer=self._layer_to_view(layer),
            growth_state=GrowthStateView(
                current_layer_count=state.current_layer_count,
                lit_layer_count=state.lit_layer_count,
                dark_layer_count=state.dark_layer_count,
                progress_percent=state.progress_percent,
                growth_status=state.growth_status,
                current_preview_url=state.current_preview_url,
                last_grow_at=state.last_grow_at,
            ),
        )

    def list_checkins(self, db: Session, user_id: int, habit_id: int | None = None) -> list[CheckinItem]:
        query = (
            select(HabitCheckin)
            .join(Habit, Habit.id == HabitCheckin.habit_id)
            .where(Habit.user_id == user_id)
            .order_by(HabitCheckin.checkin_at.desc())
        )
        if habit_id:
            query = query.where(HabitCheckin.habit_id == habit_id)
        checkins = db.scalars(query).all()
        return [
            CheckinItem(
                id=checkin.id,
                habit_id=checkin.habit_id,
                checkin_at=checkin.checkin_at,
                note=checkin.note,
                proof_media_id=checkin.proof_media_id,
            )
            for checkin in checkins
        ]

    def repair_checkin(self, db: Session, user_id: int, payload: RepairCheckinRequest) -> CheckinResult:
        repair_time = datetime.combine(payload.record_date, time.min, tzinfo=timezone.utc)
        return self.create_checkin(
            db,
            user_id,
            CheckinCreateRequest(
                habit_id=payload.habit_id,
                checkin_at=repair_time,
                note=payload.reason,
                proof_media_id=payload.proof_media_id,
            ),
        )

    def get_growth_state(self, db: Session, user_id: int, habit_id: int) -> GrowthStateResponse:
        habit = self._get_habit_owned_by_user(db, user_id, habit_id)
        state = self._get_growth_state_model(db, habit_id)
        return GrowthStateResponse(
            habit_id=habit.id,
            theme=ThemeCard(
                id=habit.theme.id,
                name=habit.theme.name,
                theme_type=habit.theme.theme_type,
                total_layers=habit.theme.total_layers,
                preview_url=habit.theme.preview_url,
            ),
            current_layer_count=state.current_layer_count,
            lit_layer_count=state.lit_layer_count,
            dark_layer_count=state.dark_layer_count,
            progress_percent=state.progress_percent,
            growth_status=state.growth_status,
            current_preview_url=state.current_preview_url,
            last_grow_at=state.last_grow_at,
        )

    def list_layers(self, db: Session, user_id: int, habit_id: int) -> list[LayerView]:
        self._get_habit_owned_by_user(db, user_id, habit_id)
        layers = db.scalars(
            select(HabitGrowthLayer)
            .where(HabitGrowthLayer.habit_id == habit_id)
            .order_by(HabitGrowthLayer.layer_no.asc())
        ).all()
        return [self._layer_to_view(layer) for layer in layers]

    def get_timeline(self, db: Session, user_id: int, habit_id: int) -> list[TimelineItem]:
        self._get_habit_owned_by_user(db, user_id, habit_id)
        checkins = db.scalars(
            select(HabitCheckin)
            .where(HabitCheckin.habit_id == habit_id)
            .order_by(HabitCheckin.checkin_at.asc())
        ).all()
        layer_map = {
            layer.checkin_id: layer
            for layer in db.scalars(
                select(HabitGrowthLayer).where(HabitGrowthLayer.habit_id == habit_id)
            ).all()
        }
        timeline: list[TimelineItem] = []
        for checkin in checkins:
            layer = layer_map.get(checkin.id)
            if not layer:
                continue
            timeline.append(
                TimelineItem(
                    checkin_id=checkin.id,
                    checkin_at=checkin.checkin_at,
                    note=checkin.note,
                    layer=self._layer_to_view(layer),
                )
            )
        return timeline

    def get_preview(self, db: Session, user_id: int, habit_id: int) -> PreviewResponse:
        self._get_habit_owned_by_user(db, user_id, habit_id)
        state = self._get_growth_state_model(db, habit_id)
        return PreviewResponse(
            habit_id=habit_id,
            preview_url=state.current_preview_url,
            updated_at=state.last_grow_at,
        )

    def create_upload_token(self, filename: str) -> MediaUploadTokenData:
        now = datetime.now(tz=timezone.utc).replace(microsecond=0)
        return MediaUploadTokenData(
            upload_url="https://upload.example.com",
            object_key=f"habit-app/{now.strftime('%Y/%m/%d')}/{filename}",
            expire_at=now,
        )

    def create_media_asset(self, db: Session, payload: MediaAssetCreateRequest) -> MediaAssetResponse:
        media = MediaAsset(**payload.model_dump())
        db.add(media)
        db.commit()
        db.refresh(media)
        return MediaAssetResponse(media_id=media.id, file_url=media.file_url)

    def seed_themes(self, db: Session) -> None:
        existing = db.scalar(select(func.count()).select_from(GrowthTheme)) or 0
        if existing:
            return
        db.add_all(
            [
                GrowthTheme(
                    name="成长建筑",
                    theme_type="building",
                    total_layers=30,
                    preview_url="https://example.com/themes/building.png",
                    config_json={"background": "city", "style": "warm"},
                ),
                GrowthTheme(
                    name="治愈小岛",
                    theme_type="island",
                    total_layers=50,
                    preview_url="https://example.com/themes/island.png",
                    config_json={"background": "sea", "style": "fresh"},
                ),
                GrowthTheme(
                    name="晚安星空",
                    theme_type="stars",
                    total_layers=40,
                    preview_url="https://example.com/themes/stars.png",
                    config_json={"background": "night", "style": "dreamy"},
                ),
            ]
        )
        db.commit()

    def seed_test_user(self, db: Session) -> None:
        existing_user = db.scalar(select(AppUser).where(AppUser.nickname == "测试用户"))
        if existing_user:
            return

        db.add(
            AppUser(
                nickname="测试用户",
                avatar_url="https://example.com/avatar/test-user.png",
            )
        )
        db.commit()

    def _habit_to_detail(self, db: Session, habit: Habit) -> HabitDetail:
        day_record = self._ensure_day_record(db, habit.id, date.today())
        state = self._get_growth_state_model(db, habit.id)
        schedule = habit.schedule or HabitSchedule(
            habit_id=habit.id,
            repeat_type="daily",
            weekdays_json=[1, 2, 3, 4, 5, 6, 7],
            timezone="Asia/Shanghai",
        )
        return HabitDetail(
            id=habit.id,
            name=habit.name,
            category=habit.category,
            description=habit.description,
            frequency_type=habit.frequency_type,
            goal_times_per_day=habit.goal_times_per_day,
            theme_id=habit.theme_id,
            theme_name=habit.theme.name,
            start_date=habit.start_date,
            end_date=habit.end_date,
            habit_status=habit.habit_status,
            schedule=SchedulePayload(
                repeat_type=schedule.repeat_type,
                weekdays=schedule.weekdays_json or [1, 2, 3, 4, 5, 6, 7],
                remind_time=schedule.remind_time,
                deadline_time=schedule.deadline_time,
                timezone=schedule.timezone,
            ),
            progress_percent=state.progress_percent,
            current_layer_count=state.current_layer_count,
            growth_status=state.growth_status,
            today_record=DayRecord(
                date=day_record.record_date,
                status=day_record.record_status,
                dark_level=day_record.dark_level,
                checkin_count=day_record.checkin_count,
            ),
        )

    def _layer_to_view(self, layer: HabitGrowthLayer) -> LayerView:
        return LayerView(
            id=layer.id,
            layer_no=layer.layer_no,
            image_url=layer.image_url,
            render_state=layer.render_state,
            x=float(layer.pos_x),
            y=float(layer.pos_y),
            z_index=layer.z_index,
            generated_at=layer.generated_at,
        )

    def _estimate_streak(self, db: Session, user_id: int) -> int:
        records = db.scalars(
            select(HabitDayRecord.record_date)
            .join(Habit, Habit.id == HabitDayRecord.habit_id)
            .where(Habit.user_id == user_id, HabitDayRecord.record_status == "completed")
            .order_by(HabitDayRecord.record_date.desc())
        ).all()
        completed_dates = set(records)
        streak = 0
        current = date.today()
        while current in completed_dates:
            streak += 1
            current = current.fromordinal(current.toordinal() - 1)
        return streak

    def _get_habit_owned_by_user(self, db: Session, user_id: int, habit_id: int) -> Habit:
        habit = db.scalar(
            select(Habit)
            .options(
                joinedload(Habit.schedule),
                joinedload(Habit.theme),
                joinedload(Habit.growth_state),
            )
            .where(Habit.id == habit_id, Habit.user_id == user_id)
        )
        if not habit:
            raise HTTPException(status_code=404, detail="Habit not found")
        return habit

    def _ensure_day_record(self, db: Session, habit_id: int, target_date: date) -> HabitDayRecord:
        record = db.scalar(
            select(HabitDayRecord).where(
                HabitDayRecord.habit_id == habit_id,
                HabitDayRecord.record_date == target_date,
            )
        )
        if record is None:
            record = HabitDayRecord(
                habit_id=habit_id,
                record_date=target_date,
                record_status="pending",
                should_checkin=True,
                checkin_count=0,
                is_late=False,
                dark_level=0,
            )
            db.add(record)
            db.flush()
        return record

    def _get_growth_state_model(self, db: Session, habit_id: int) -> HabitGrowthState:
        state = db.get(HabitGrowthState, habit_id)
        if state is None:
            habit = db.get(Habit, habit_id)
            preview_url = habit.theme.preview_url if habit and habit.theme else None
            state = HabitGrowthState(
                habit_id=habit_id,
                current_layer_count=0,
                lit_layer_count=0,
                dark_layer_count=0,
                progress_percent=Decimal("0.00"),
                growth_status="growing",
                current_preview_url=preview_url,
                last_grow_at=None,
            )
            db.add(state)
            db.flush()
        return state


store = DatabaseStore()
