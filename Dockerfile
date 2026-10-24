# ── 1 · Build ────────────────────────────────────────────────────────────────────────────────────────────────────────
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --legacy-peer-deps

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

# ── 2 · Run ──────────────────────────────────────────────────────────────────────────────────────────────────────────
FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --legacy-peer-deps && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY .env.example ./
RUN mkdir -p /var/log/metbot && chown node:node /var/log/metbot

USER node
EXPOSE 8080
HEALTHCHECK --interval=60s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-8080}/admin/health" > /dev/null || exit 1
CMD ["node", "dist/main"]
