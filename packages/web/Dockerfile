# ---- Base ----
FROM node:22-alpine AS base
WORKDIR /app

# ---- Build ----
FROM base AS build
RUN npm install -g bun
COPY package.json bun.lock ./
COPY packages/ai-core/package.json ./packages/ai-core/
COPY packages/api/package.json ./packages/api/
COPY packages/core/package.json ./packages/core/
COPY packages/db/package.json ./packages/db/
COPY packages/jobs/package.json ./packages/jobs/
COPY packages/shared/package.json ./packages/shared/
COPY packages/web/package.json ./packages/web/
RUN bun install --frozen-lockfile || bun install
COPY tsconfig.base.json ./
COPY packages/shared/ ./packages/shared/
COPY packages/web/ ./packages/web/
WORKDIR /app/packages/web
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_GEOLYT_API_URL
ENV NEXT_PUBLIC_GEOLYT_API_URL=$NEXT_PUBLIC_GEOLYT_API_URL
ARG NEXT_PUBLIC_BETTER_AUTH_URL
ENV NEXT_PUBLIC_BETTER_AUTH_URL=$NEXT_PUBLIC_BETTER_AUTH_URL
RUN bun run build

# ---- Production ----
FROM base AS production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
COPY --chmod=0755 --from=build --chown=nextjs:nodejs /app/packages/web/.next/standalone ./
COPY --chmod=0755 --from=build --chown=nextjs:nodejs /app/packages/web/.next/static ./packages/web/.next/static
COPY --chmod=0755 --from=build --chown=nextjs:nodejs /app/packages/web/public ./packages/web/public
USER nextjs
WORKDIR /app/packages/web
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
