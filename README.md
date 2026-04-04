# Newton Academy Bot Platform

Telegram bot platform for Newton Academy admissions pipeline.

## Structure

```
newton-bot-platform/
├── apps/
│   ├── backend/           # NestJS backend (bot + admin API)
│   └── admin-miniapp/     # Next.js admin Telegram Mini App
├── docker-compose.yml     # Full local stack
└── DEPLOY.md              # Railway deployment guide
```

## Quick Start

```bash
# 1. Start databases
docker-compose up postgres redis -d

# 2. Backend
cd apps/backend
cp .env.example .env     # Fill in your values
npm install
npx prisma db push
npm run start:dev

# 3. Admin Mini App
cd apps/admin-miniapp
npm install
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000 npm run dev
```

## Deploy

See [DEPLOY.md](./DEPLOY.md) for Railway deployment instructions.

## Stack

- **Bot**: NestJS + nestjs-telegraf + Telegraf
- **DB**: PostgreSQL + Prisma ORM
- **Queue**: Redis + BullMQ
- **Admin API**: NestJS REST + JWT auth
- **Mini App**: Next.js (static export) + Telegram SDK + React Query
- **Sheets**: Google Sheets API (async via BullMQ)
