# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --legacy-peer-deps

# Generate Prisma client
RUN npx prisma generate

# Copy source and build
COPY . .
RUN npm run build

# ─── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Install openssl for Prisma
RUN apk add --no-cache openssl

# Install only production deps
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production --legacy-peer-deps && \
    npx prisma generate && \
    npm cache clean --force

# Copy compiled output
COPY --from=builder /app/dist ./dist

# Copy i18n files
COPY --from=builder /app/dist/i18n ./dist/i18n

# Set ownership
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs && \
    chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3000

ENV NODE_ENV=production

# Run migrations and start server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]
