# ── PROJECT-X Frontend Dockerfile ─────────────────
FROM node:20-alpine AS base
WORKDIR /app

# ── Dependencies ──────────────────────────────────
FROM base AS deps
COPY package*.json ./
RUN npm ci && npm cache clean --force

# ── Development ───────────────────────────────────
FROM deps AS development
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ── Builder ───────────────────────────────────────
FROM deps AS builder
COPY . .
RUN npm run build

# ── Production (nginx) ────────────────────────────
FROM nginx:1.25-alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
