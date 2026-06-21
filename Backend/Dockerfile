# --- Build stage -------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# --- Production dependencies only --------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# --- Runtime stage ------------------------------------------------------------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# yt-dlp + ffmpeg are required for YouTube audio fallback transcription
# (youtube.service.ts) and would-be audio chunking for long files.
RUN apk add --no-cache python3 ffmpeg curl \
  && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
  && chmod a+rx /usr/local/bin/yt-dlp

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./

EXPOSE 4000

# Default command runs the API server; override with `node dist/worker-server.js`
# for the worker process container (see docker-compose.prod.yml in SDS.md).
CMD ["node", "dist/server.js"]
