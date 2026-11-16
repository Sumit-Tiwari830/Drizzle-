# Multi-stage TypeScript Dockerfile for Dating App Backend
FROM node:22-alpine AS builder
WORKDIR /app

COPY backend/package*.json ./
RUN npm ci

COPY backend/tsconfig.json ./
COPY backend/drizzle.config.ts ./
COPY backend/src ./src

RUN npm run build

# Production Runner Image
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY backend/package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

EXPOSE 5000

CMD ["node", "dist/server.js"]
