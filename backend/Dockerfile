# ── PROJECT-X Backend Dockerfile ──────────────────
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache dumb-init

# ── Dependencies ──────────────────────────────────
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# ── Development ───────────────────────────────────
FROM base AS development
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["dumb-init", "node", "-r", "dotenv/config", "src/server.js"]

# ── Production ────────────────────────────────────
FROM base AS production
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p logs
EXPOSE 5000
USER node
CMD ["dumb-init", "node", "src/server.js"]
