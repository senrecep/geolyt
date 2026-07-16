# ---- Base ----
FROM oven/bun:1-alpine AS base
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
COPY package.json bun.lock ./
COPY packages/ai-core/package.json ./packages/ai-core/
COPY packages/api/package.json ./packages/api/
COPY packages/core/package.json ./packages/core/
COPY packages/db/package.json ./packages/db/
COPY packages/jobs/package.json ./packages/jobs/
COPY packages/shared/package.json ./packages/shared/
COPY packages/web/package.json ./packages/web/
RUN bun install --frozen-lockfile --production || bun install --production

# ---- Build ----
FROM base AS build
COPY package.json bun.lock ./
COPY packages/ai-core/package.json ./packages/ai-core/
COPY packages/api/package.json ./packages/api/
COPY packages/core/package.json ./packages/core/
COPY packages/db/package.json ./packages/db/
COPY packages/jobs/package.json ./packages/jobs/
COPY packages/shared/package.json ./packages/shared/
COPY packages/web/package.json ./packages/web/
RUN bun install --frozen-lockfile || bun install
COPY packages/shared/ ./packages/shared/
COPY packages/ai-core/ ./packages/ai-core/
COPY packages/core/ ./packages/core/
COPY packages/db/ ./packages/db/
COPY packages/jobs/ ./packages/jobs/
COPY packages/api/ ./packages/api/
RUN cd packages/api && bun run build

# ---- Production ----
FROM base AS production
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 bungroup && \
    adduser --system --uid 1001 bunuser
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/ ./packages/shared/
COPY --from=build /app/packages/ai-core/ ./packages/ai-core/
COPY --from=build /app/packages/core/ ./packages/core/
COPY --from=build /app/packages/db/ ./packages/db/
COPY --from=build /app/packages/jobs/ ./packages/jobs/
COPY --chmod=0755 --from=build /app/packages/api/dist ./packages/api/dist
COPY packages/api/package.json ./packages/api/
COPY packages/api/docker-entrypoint.sh ./packages/api/

WORKDIR /app/packages/api
USER bunuser
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["bun", "run", "dist/server.js"]
