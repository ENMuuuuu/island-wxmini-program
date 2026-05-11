# Habit Growth API

基于 `FastAPI` 的习惯打卡与成长图层后端骨架，已包含以下接口模块：

- 认证：登录、获取当前用户
- 用户：个人资料、首页聚合
- 习惯：创建、列表、详情、更新、状态切换、日历
- 打卡：打卡、补签、记录列表
- 成长：主题列表、成长状态、图层列表、时间线、预览
- 媒体：上传凭证、媒体登记

## 启动 MySQL

```bash
docker compose up -d
```

默认会启动一个 `MySQL 8` 容器，连接信息已经写入 `.env`：

```text
DATABASE_URL=mysql+pymysql://habit_user:habit_password@127.0.0.1:3306/habit_app?charset=utf8mb4
```

## 启动 API

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

启动后访问：

- 文档：`http://127.0.0.1:8000/docs`
- 根路径：`http://127.0.0.1:8000/`
- 接口文档：`API_DOCUMENTATION.md`
- 数据库脚本：`sql/schema.sql`、`sql/seed.sql`

## 使用说明

1. 先调用 `POST /api/v1/auth/login`
2. 拿到返回的 JWT `token`
3. 在 Swagger 页面右上角点 `Authorize`
4. 填入：

```text
Bearer <登录接口返回的 token>
```

5. 或者手动带请求头：

```text
Authorization: Bearer <登录接口返回的 token>
```

也支持直接传原始 token：

```text
Authorization: <登录接口返回的 token>
```

默认还会初始化一个测试用户，便于直接联调：

- `nickname`: `测试用户`
- `avatar_url`: `https://example.com/avatar/test-user.png`
- 登录时可随便传一个 `login_code`，只要昵称填 `测试用户` 就会命中该账号并返回 JWT

## 当前实现说明

- 当前版本已接入 `SQLAlchemy + MySQL`，通过 `.env` 里的 `DATABASE_URL` 连接数据库
- 使用 `docker-compose.yml` 启动 Docker MySQL
- 应用启动时会自动建表，并初始化默认成长主题和测试用户
- 登录鉴权已改为 JWT，密钥和过期时间通过 `.env` 配置
- 仓库已提供 `sql` 目录，便于导出到 GitHub 后快速恢复数据库结构与测试数据
