# ---- Base ----
FROM oven/bun:1-alpine AS base
WORKDIR /app
# Chromium + fonts for PDF generation in the report worker
# The alpine chromium package already provides /usr/bin/chromium.
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-dejavu fontconfig && \
    fc-cache -f
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium

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
RUN cd packages/jobs && bun run build

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
COPY --chmod=0755 --from=build /app/packages/jobs/dist ./packages/jobs/dist
COPY packages/jobs/package.json ./packages/jobs/

WORKDIR /app/packages/jobs
USER bunuser
CMD ["bun", "run", "dist/main.js"]
