# 后端需求清单

---

## 需求 1：打卡心得（Checkin Note）

### 数据库

在 `HabitCheckin`（或对应打卡记录表）中新增字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `note` | `VARCHAR(500)` nullable | 用户本次打卡的心得文字 |

### 接口

**PATCH `/checkins/{checkin_id}/note`**

- 鉴权：Bearer JWT（CurrentUser）
- Path param：`checkin_id`（打卡记录ID）
- Request body：
  ```json
  { "note": "今天跑了5公里，感觉很棒！" }
  ```
- Response：
  ```json
  { "code": 0, "message": "ok", "data": { "checkin_id": "...", "note": "..." } }
  ```
- 权限校验：确认 checkin 记录属于当前登录用户，否则返回 403

> ✅ 此接口已在 backend/app/api.py 中实现（`PATCH /checkins/{checkin_id}/note`），数据库 `HabitCheckin.note` 字段已存在，无需额外工作。

---

## 需求 2：用户资料扩展（Profile Extension）

### 数据库

在 `AppUser` 表中新增字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `bio` | `VARCHAR(200)` nullable | 个性签名 |
| `birthday` | `DATE` nullable | 生日 |

> `avatar_url` 字段已存在，本次只需扩展 PUT 接口支持接收这两个新字段。

### 接口

**PUT `/users/me/profile`**（已存在，扩展 payload）

- 鉴权：Bearer JWT（CurrentUser）
- 现有字段：`nickname`、`avatar_url`
- 新增字段：`bio`（可选）、`birthday`（可选，格式 `YYYY-MM-DD`）
- Request body：
  ```json
  {
    "nickname": "新昵称",
    "avatar_url": "https://...",
    "bio": "一句话签名",
    "birthday": "1995-06-15"
  }
  ```
- Response：返回完整 `UserProfile` 对象，包含 `bio`、`birthday` 字段
- `UserProfile` schema 需同步新增 `bio: str | None` 和 `birthday: date | None`

### GET `/auth/me` 响应扩展

`/auth/me` 返回的用户对象也需要包含 `bio` 和 `birthday` 字段，供前端编辑页回填使用。

> ✅ `AppUser` 模型已有 `bio` 和 `birthday` 字段，`UserProfile` schema 已包含这两个字段，`PUT /users/me/profile` 和 `GET /auth/me` 均已实现。无需额外工作。

---

## 需求 3（新增，P0）：首页接口 `/users/me/home` 返回数据不足

### 问题

当前后端 `HomePageData.today_habits` 字段类型为 `list[HomeHabitItem]`，`HomeHabitItem` 只包含：
```
habit_id, habit_name, category, today_status, progress_percent
```

而前端首页需要以下字段才能正常渲染习惯卡片和长按打卡：

| 字段 | 当前状态 | 用途 |
|------|----------|------|
| `id` | ❌ 缺失（只有 `habit_id`） | 打卡请求中的 habit_id，卡片 data-id |
| `name` | ❌ 缺失（只有 `habit_name`） | 卡片显示名称 |
| `theme_type` | ❌ 缺失 | 主题色竖条颜色、canvas 渲染 |
| `today_record.status` | ❌ 缺失（只有 `today_status`） | 判断是否已打卡 |
| `streak` | ❌ 缺失 | 卡片连击天数显示 |
| `growth_state.lit_layer_count` | ❌ 缺失 | canvas 渲染层数 |
| `growth_state.dark_layer_count` | ❌ 缺失 | 衰退提示 chip |

### 需求

将 `HomePageData.today_habits` 的元素类型从 `HomeHabitItem` 改为 `HabitDetail`（或新建一个 `HomeHabitDetail` 包含上述所有字段）。

**推荐方案**：复用现有 `HabitDetail` schema，`store.get_home()` 中将 `today_habits` 改为调用 `_habit_to_detail()` 来构建每个元素。

**`HomePageData` schema 修改**：
```python
class HomePageData(BaseModel):
    user: UserProfile
    today_habits: list[HabitDetail]   # 从 list[HomeHabitItem] 改为 list[HabitDetail]
    completed_count: int
    pending_count: int
    featured_growth: PreviewResponse | None = None
```

**`store.get_home()` 修改**：
```python
def get_home(self, db, user_id):
    ...
    today_habits = [self._habit_to_detail(db, habit) for habit in habits]
    completed_count = sum(1 for h in today_habits if h.today_record.status == "completed")
    pending_count   = sum(1 for h in today_habits if h.today_record.status == "pending")
    return HomePageData(user=user, today_habits=today_habits, ...)
```

> 注意：`HabitDetail` 中没有 `streak` 字段（见 `HabitCard/HabitDetail` schema）。如需前端显示连击天数，还需在 `HabitDetail` 或 `HomeHabitDetail` 中新增 `streak: int = 0`，并在 `_habit_to_detail` 中计算（查 `HabitDayRecord` 连续 `completed` 天数）。

---

## 需求 4（新增，P1）：`POST /checkins/repair` 接口参数对齐

### 问题

前端 `repairLayer(habitId)` 用于修复一个衰退（dark）层，调用 `POST /checkins/repair`。
后端该接口接收 `RepairCheckinRequest { habit_id, record_date, reason?, proof_media_id? }`，
其中 `record_date` 是必填字段，前端目前传的是今天的日期（`new Date().toISOString().split('T')[0]`）。

### 确认

后端逻辑（`store.repair_checkin`）实际是为指定日期补一次打卡，并不是"把最近一个 dark 层转为 lit"。
如果产品逻辑是"修复最近的一个衰退块"，需要后端新增一个 `POST /growth/habits/{habit_id}/repair` 接口，直接修复最新的一个 dark 层（无需前端传 `record_date`）。

**推荐方案**：在 `api.py` 新增端点：
```python
@api_router.post("/growth/habits/{habit_id}/repair", ...)
async def repair_growth_layer(habit_id: int, user_id: CurrentUser, db: DbSession):
    # 找到该 habit 最近的一个 dark layer，将其 render_state 改为 normal
    # 更新 growth_state.dark_layer_count -= 1, lit_layer_count += 1
    return APIResponse(data=...)
```

Response 格式与前端期望一致：
```json
{
  "code": 0,
  "data": {
    "repaired_layer": { ...LayerView... },
    "growth_state":   { ...GrowthStateView... }
  }
}
```

---

## 需求 5（新增，P2）：`HabitDetail` 新增 `streak` 字段

前端首页卡片和详情页均显示习惯的连击天数（streak），但当前 `HabitDetail` schema 和 `_habit_to_detail()` 均未包含该字段。

**在 `HabitCard` schema 新增**：
```python
streak: int = 0
```

**在 `_habit_to_detail()` 中计算**：
```python
# 查询 habit_day_record 连续 completed 天数（倒序）
streak = self._calc_streak(db, habit.id)
```

---

## 优先级汇总

| 需求 | 优先级 | 状态 |
|------|--------|------|
| 打卡心得 PATCH 接口 | P0 | ✅ 已实现 |
| AppUser bio/birthday 字段 + 接口 | P0 | ✅ 已实现 |
| **首页 `/users/me/home` 返回完整 HabitDetail**（需求 3） | **P0** | ❌ 待实现 |
| **新增 `POST /growth/habits/{id}/repair` 端点**（需求 4） | **P1** | ❌ 待实现 |
| **HabitDetail 新增 streak 字段**（需求 5） | **P1** | ❌ 待实现 |
| GET /auth/me 返回 bio/birthday | P2 | ✅ 已实现 |
