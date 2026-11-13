# -----------------------------------
# Stage 1: Build Stage
# -----------------------------------
FROM node:22-alpine AS builder
WORKDIR /app

# Copy package files from backend folder (Corrected path)
COPY backend/package*.json ./
RUN npm install

# Copy all source code from backend folder (Corrected path)
COPY backend/ .
RUN npm run build

# -----------------------------------
# Stage 2: Production Stage
# -----------------------------------
FROM node:22-alpine
WORKDIR /app

# Copy package files from backend folder
COPY backend/package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/stream.js"]