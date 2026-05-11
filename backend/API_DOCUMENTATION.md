# API 接口文档

适用项目：`Habit Growth API`

当前后端基于 `FastAPI` 构建，默认接口前缀为：

```text
/api/v1
```

## 1. 通用约定

### 1.1 鉴权方式

除登录接口和主题查询外，其他接口默认需要携带请求头：

```text
Authorization: Bearer <token>
```

登录成功后，示例 token 为 JWT：

```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 1.2 通用响应格式

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

### 1.3 常见状态码

- `200` 请求成功
- `401` 未登录或 token 无效
- `404` 资源不存在
- `409` 业务状态冲突，例如习惯不是激活状态

## 2. 认证模块

### 2.1 登录

- 方法：`POST`
- 路径：`/api/v1/auth/login`
- 描述：小程序登录，返回当前用户和访问 token

请求体：

```json
{
  "login_code": "wx_code_xxx",
  "nickname": "小王",
  "avatar_url": "https://example.com/avatar.png"
}
```

响应示例：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "expires_in": 604800,
    "user": {
      "id": 1,
      "nickname": "小王",
      "avatar_url": "https://example.com/avatar.png",
      "habit_count": 0,
      "total_checkin_count": 0,
      "current_streak_days": 0
    }
  }
}
```

### 2.2 获取当前用户

- 方法：`GET`
- 路径：`/api/v1/auth/me`
- 描述：获取当前登录用户资料

## 3. 用户模块

### 3.1 获取个人资料

- 方法：`GET`
- 路径：`/api/v1/users/me/profile`

响应字段：

- `id` 用户 ID
- `nickname` 昵称
- `avatar_url` 头像地址
- `habit_count` 习惯数
- `total_checkin_count` 总打卡数
- `current_streak_days` 当前连续打卡天数

### 3.2 更新个人资料

- 方法：`PUT`
- 路径：`/api/v1/users/me/profile`

请求体：

```json
{
  "nickname": "新的昵称",
  "avatar_url": "https://example.com/new-avatar.png"
}
```

### 3.3 首页聚合

- 方法：`GET`
- 路径：`/api/v1/users/me/home`
- 描述：获取首页需要展示的聚合数据

响应字段：

- `user` 当前用户信息
- `today_habits` 今日习惯列表
- `completed_count` 今日已完成数量
- `pending_count` 今日待完成数量
- `featured_growth` 首页主展示成长预览

## 4. 成长主题模块

### 4.1 获取主题列表

- 方法：`GET`
- 路径：`/api/v1/growth/themes`
- 描述：获取可选成长主题列表

响应项字段：

- `id` 主题 ID
- `name` 主题名称
- `theme_type` 主题类型
- `total_layers` 总图层数
- `preview_url` 主题预览图

### 4.2 获取主题详情

- 方法：`GET`
- 路径：`/api/v1/growth/themes/{theme_id}`
- 描述：获取单个主题的配置详情

路径参数：

- `theme_id` 主题 ID

## 5. 习惯模块

### 5.1 创建习惯

- 方法：`POST`
- 路径：`/api/v1/habits`

请求体：

```json
{
  "name": "阅读30分钟",
  "category": "reading",
  "description": "每天晚上阅读",
  "frequency_type": "daily",
  "goal_times_per_day": 1,
  "theme_id": 2,
  "start_date": "2026-05-05",
  "end_date": null,
  "schedule": {
    "repeat_type": "daily",
    "weekdays": [1, 2, 3, 4, 5, 6, 7],
    "remind_time": "21:00:00",
    "deadline_time": "23:59:59",
    "timezone": "Asia/Shanghai"
  }
}
```

响应字段：

- `id` 习惯 ID
- `name` 习惯名称
- `category` 分类
- `theme_id` 主题 ID
- `theme_name` 主题名称
- `habit_status` 习惯状态
- `progress_percent` 当前成长进度
- `current_layer_count` 当前图层数
- `growth_status` 成长状态
- `today_record` 今日履约记录

### 5.2 获取习惯列表

- 方法：`GET`
- 路径：`/api/v1/habits`

查询参数：

- `status` 可选，值为 `active`、`paused`、`archived`

### 5.3 获取习惯详情

- 方法：`GET`
- 路径：`/api/v1/habits/{habit_id}`

路径参数：

- `habit_id` 习惯 ID

### 5.4 更新习惯

- 方法：`PUT`
- 路径：`/api/v1/habits/{habit_id}`

请求体示例：

```json
{
  "name": "阅读45分钟",
  "description": "每天晚饭后阅读",
  "goal_times_per_day": 1,
  "theme_id": 3,
  "end_date": "2026-12-31",
  "schedule": {
    "repeat_type": "daily",
    "weekdays": [1, 2, 3, 4, 5, 6, 7],
    "remind_time": "20:30:00",
    "deadline_time": "23:30:00",
    "timezone": "Asia/Shanghai"
  }
}
```

### 5.5 更新习惯状态

- 方法：`PATCH`
- 路径：`/api/v1/habits/{habit_id}/status`

请求体：

```json
{
  "status": "paused"
}
```

可选值：

- `active`
- `paused`
- `archived`

### 5.6 获取习惯日历

- 方法：`GET`
- 路径：`/api/v1/habits/{habit_id}/calendar`

查询参数：

- `year_month` 必填，格式 `YYYY-MM`

响应示例：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "habit_id": 1,
    "year_month": "2026-05",
    "days": [
      {
        "date": "2026-05-04",
        "status": "completed",
        "dark_level": 0,
        "checkin_count": 1
      }
    ]
  }
}
```

## 6. 打卡模块

### 6.1 创建打卡

- 方法：`POST`
- 路径：`/api/v1/checkins`
- 描述：完成一次打卡，并生成新的成长图层

请求体：

```json
{
  "habit_id": 1,
  "checkin_at": "2026-05-04T21:30:00+08:00",
  "note": "今天读了40分钟",
  "proof_media_id": 35
}
```

响应示例：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "checkin_id": 1,
    "day_record": {
      "date": "2026-05-04",
      "status": "completed",
      "dark_level": 0,
      "checkin_count": 1
    },
    "new_layer": {
      "id": 1,
      "layer_no": 1,
      "image_url": "https://example.com/generated/habit-1/layer-1.png",
      "render_state": "normal",
      "x": 8.0,
      "y": 6.0,
      "z_index": 1,
      "generated_at": "2026-05-04T21:30:00+08:00"
    },
    "growth_state": {
      "current_layer_count": 1,
      "lit_layer_count": 1,
      "dark_layer_count": 0,
      "progress_percent": 2.00,
      "growth_status": "growing",
      "current_preview_url": "https://example.com/generated/habit-1/preview-1.png",
      "last_grow_at": "2026-05-04T21:30:00+08:00"
    }
  }
}
```

### 6.2 获取打卡列表

- 方法：`GET`
- 路径：`/api/v1/checkins`

查询参数：

- `habit_id` 可选，按习惯筛选

### 6.3 补签

- 方法：`POST`
- 路径：`/api/v1/checkins/repair`

请求体：

```json
{
  "habit_id": 1,
  "record_date": "2026-05-03",
  "reason": "昨天忘记点了",
  "proof_media_id": 36
}
```

## 7. 成长展示模块

### 7.1 获取成长状态

- 方法：`GET`
- 路径：`/api/v1/growth/habits/{habit_id}/state`

响应字段：

- `theme` 当前绑定主题
- `current_layer_count` 当前图层数
- `lit_layer_count` 亮态图层数
- `dark_layer_count` 暗态图层数
- `progress_percent` 成长进度
- `growth_status` 成长状态
- `current_preview_url` 当前预览图
- `last_grow_at` 最近生长时间

### 7.2 获取成长图层列表

- 方法：`GET`
- 路径：`/api/v1/growth/habits/{habit_id}/layers`
- 描述：前端成长页按图层堆叠展示时调用

响应项字段：

- `id` 图层实例 ID
- `layer_no` 图层序号
- `image_url` 图层图片地址
- `render_state` 渲染状态，`normal` 或 `dark`
- `x` 图层 X 坐标
- `y` 图层 Y 坐标
- `z_index` 层级
- `generated_at` 生成时间

### 7.3 获取成长时间线

- 方法：`GET`
- 路径：`/api/v1/growth/habits/{habit_id}/timeline`
- 描述：按打卡时间返回成长过程

### 7.4 获取当前预览图

- 方法：`GET`
- 路径：`/api/v1/growth/habits/{habit_id}/preview`

响应示例：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "habit_id": 1,
    "preview_url": "https://example.com/generated/habit-1/preview-8.png",
    "updated_at": "2026-05-04T21:30:00+08:00"
  }
}
```

## 8. 媒体模块

### 8.1 获取上传凭证

- 方法：`POST`
- 路径：`/api/v1/media/upload-token`

请求体：

```json
{
  "filename": "habit-proof.png",
  "content_type": "image/png"
}
```

响应示例：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "upload_url": "https://upload.example.com",
    "object_key": "habit-app/2026/05/04/habit-proof.png",
    "expire_at": "2026-05-04T13:00:00+00:00"
  }
}
```

### 8.2 登记媒体资源

- 方法：`POST`
- 路径：`/api/v1/media/assets`

请求体：

```json
{
  "storage_type": "oss",
  "bucket": "habit-app",
  "object_key": "habit-app/2026/05/04/habit-proof.png",
  "file_url": "https://cdn.example.com/habit-proof.png",
  "mime_type": "image/png",
  "width": 512,
  "height": 512,
  "size_bytes": 102400,
  "file_hash": "sha256_xxx"
}
```

响应示例：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "media_id": 1,
    "file_url": "https://cdn.example.com/habit-proof.png"
  }
}
```

##
