# Newton Academy Bot Platform — Railway Deployment Guide

Follow these steps to deploy the full stack on [Railway](https://railway.app).

## Architecture on Railway

```
railway project
├── Service: backend    (NestJS — Docker)
├── Service: admin      (Next.js MiniApp — Docker)
├── Service: postgres   (Railway PostgreSQL plugin)
└── Service: redis      (Railway Redis plugin)
```

---

## Step 1 — Create a Railway Project

1. Go to [railway.app](https://railway.app) → **New Project**
2. Click **Add Service** → **Database** → add **PostgreSQL**
3. Click **Add Service** → **Database** → add **Redis**

---

## Step 2 — Deploy the Backend

1. Click **Add Service** → **GitHub Repo**
2. Select this repo + set **Root Directory** to `apps/backend`
3. Railway auto-detects the `Dockerfile`

**Environment Variables to set on the backend service:**

```
BOT_TOKEN=your_telegram_bot_token
BOT_USERNAME=YourBotName
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_HOST=${{Redis.REDIS_HOST}}
REDIS_PORT=${{Redis.REDIS_PORT}}
REDIS_PASSWORD=${{Redis.REDIS_PASSWORD}}
ADMIN_JWT_SECRET=64_char_random_string_here
ADMIN_PANEL_URL=https://your-admin-miniapp.up.railway.app
MINI_APP_URL=https://your-admin-miniapp.up.railway.app
GOOGLE_SHEET_ID=...
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY=...
NODE_ENV=production
```

---

## Step 3 — Deploy the Admin Mini App

1. Click **Add Service** → **GitHub Repo**
2. Select this repo + set **Root Directory** to `apps/admin-miniapp`

**Environment Variables:**

```
NEXT_PUBLIC_BACKEND_URL=https://your-backend.up.railway.app
```

---

## Step 4 — First Run: Seed Admin User

After backend deploys, run in Railway shell or locally:

```bash
ADMIN_EMAIL=admin@newton.uz \
ADMIN_PASSWORD=YourSecurePassword \
DATABASE_URL=... \
npx ts-node -r tsconfig-paths/register scripts/seed-admin.ts
```

---

## Step 5 — Link Telegram Account to Admin

After the admin user is created, link their Telegram ID so they can log in via Mini App:

```bash
# Find the admin's Telegram user ID (from @userinfobot on Telegram)
# Then run:
curl -X PATCH https://your-backend.up.railway.app/api/admin/admin-users/{id} \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"telegram_id": "123456789"}'
```

---

## Step 6 — Set BotFather Menu Button

In Telegram BotFather:
1. `/mybots` → Select your bot
2. **Bot Settings** → **Menu Button** → **Configure menu button**
3. Set URL to: `https://your-admin-miniapp.up.railway.app`
4. Set text: `⚙️ Admin Panel`

> The backend will also auto-set this on startup if `MINI_APP_URL` is set.

---

## Health Checks

- Backend: `GET /health/ping` → `{ status: 'ok' }`
- Admin API docs: `GET /api/docs` (set `SWAGGER_ENABLED=true`)

---

## Local Development

```bash
# 1. Start databases
docker-compose up postgres redis -d

# 2. Start backend
cd apps/backend && npm run start:dev

# 3. Start Mini App
cd apps/admin-miniapp && npm run dev
```

Mini App runs at `http://localhost:3001`, Backend at `http://localhost:3000`.
