#!/bin/bash

# Newton Academy — Staging Environment Setup
# This script prepares the staging environment, generates self-signed certificates
# (for testing), and builds the docker containers.

set -e

echo "🚀 Starting Staging Setup..."

# 1. Create directories
mkdir -p nginx/certs

# 2. Check for staging environment variables
if [ ! -f .env.staging ]; then
    echo "⚠️  .env.staging not found. Creating from example..."
    cp apps/backend/.env.staging.example .env.staging
    echo "🚨 ACTION REQUIRED: Edit the .env.staging file with real tokens!"
fi

# 3. Generate self-signed certificates (if not present)
if [ ! -f nginx/certs/fullchain.pem ]; then
    echo "🔐 Generating self-signed certificates for testing..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/certs/privkey.pem -out nginx/certs/fullchain.pem \
        -subj "/C=UZ/ST=Tashkent/L=Tashkent/O=Newton Academy/OU=Staging/CN=staging.newton.uz"
fi

# 4. Prepare backend .env (Prisma needs it locally for migrations sometimes)
if [ ! -f apps/backend/.env ]; then
    echo "📝 Symlinking .env.staging to backend for Prisma..."
    cp .env.staging apps/backend/.env
fi

# 5. Build and launch
echo "📦 Building Staging Stack..."
STAGING_DOMAIN=$(grep STAGING_DOMAIN .env.staging | cut -d '=' -f2 | tr -d '"')
export STAGING_DOMAIN

docker-compose -f docker-compose.staging.yml up --build -d

echo "✅ Staging environment is launching!"
echo "📍 Access Student TMA: https://${STAGING_DOMAIN}/student"
echo "📍 Access Admin Panel: https://${STAGING_DOMAIN}/admin"
echo "📍 API Health: https://${STAGING_DOMAIN}/api/health/ping"
echo ""
echo "📝 NEXT STEP: Run 'docker-compose -f docker-compose.staging.yml exec backend npx prisma migrate deploy' to setup the DB."
echo "📝 NEXT STEP: Run 'docker-compose -f docker-compose.staging.yml exec backend npx ts-node -r tsconfig-paths/register scripts/seed-admin.ts' to create the first admin."
echo ""
echo "🚀 FOR TUNNELING:"
echo "If using ngrok: ngrok http 8081"
echo "If using cloudflared: cloudflared tunnel --url http://localhost:8081"
echo "Then update STAGING_DOMAIN in .env.staging with the provided hostname and rerun this script."
