# Geolyt — Deployment Guide

> Targets: local Docker Compose, Dokploy on a personal VDS.

---

## Local Development

Start only the infrastructure services and run the app with Bun:

```bash
cp .env.example .env
# edit .env and add real AI / Stripe / R2 keys

docker compose up -d
bun run db:push
bun run dev
```

Services exposed on localhost:

| Service | URL |
|---|---|
| PostgreSQL | `localhost:5432` |
| Redis | `localhost:6379` |
| Firecrawl | `http://localhost:3002` |
| Playwright | `http://localhost:3000` |

---

## Local Full Stack (Docker)

To run the whole stack locally with Docker:

```bash
cp .env.example .env
# fill in real values

docker compose -f docker-compose.yml -f docker-compose.app.yml up -d --build
```

The API entrypoint runs migrations automatically on startup.

| Service | URL |
|---|---|
| Dashboard (web) | `http://localhost:3000` |
| API | `http://localhost:4000` |

---

## Dokploy Production

Two deployment patterns are supported. Pick one.

### Option A — Two-stack (recommended)

Keeps infrastructure and apps separate. Easier to scale and maintain.

1. **Infra stack**
   - Dokploy project > Add "Docker Compose" service named `infra`
   - Compose file: `docker-compose.infra.dokploy.yml`
   - Paste the PostgreSQL/Redis section from `dokploy.app.env` into Environment
   - Disable "Enable Isolated Deployment"
   - Deploy

2. **App stack**
   - Dokploy project > Add "Docker Compose" service named `app`
   - Compose file: `docker-compose.app.dokploy.yml`
   - Paste the full contents of `dokploy.app.env` into Environment
   - Set `NEXT_PUBLIC_*` values as **Build Args** on the `web` service
   - Disable "Enable Isolated Deployment"
   - Deploy

3. **Run migrations**
   - Dokploy > `api` service > Console:
     ```bash
     bun /app/packages/db/src/migrate.ts
     ```

4. **Domains**
   - Dokploy > `api` service > Domains: add `api.geolyt.io`
   - Dokploy > `web` service > Domains: add `app.geolyt.io` (and any white-label CNAMEs)

### Option B — Single stack

For smaller VDS setups.

1. Dokploy project > Add "Docker Compose" service named `app`
2. Compose file: `docker-compose.dokploy.yml`
3. Paste `dokploy.app.env` into Environment
4. Set `NEXT_PUBLIC_*` values as Build Args on the `web` service
5. Disable "Enable Isolated Deployment"
6. Deploy
7. Run migrations from the `api` console
8. Configure domains

---

## Environment Variables

See `dokploy.app.env` for the production template and `.env.example` for local development.

Critical variables:

- `BETTER_AUTH_SECRET` — must be at least 32 characters
- `POSTGRES_PASSWORD`, `REDIS_PASSWORD` — strong, unique values
- `NEXT_PUBLIC_*` — baked at build time; set in Dokploy Build Args for the `web` service

---

## First Deploy Checklist

- [ ] Infra stack is healthy (`geolyt-postgres`, `geolyt-redis` running)
- [ ] App stack deployed with all env vars
- [ ] Database migration executed
- [ ] Domains configured and SSL active
- [ ] Stripe webhook endpoint registered (if using billing)
- [ ] Cloudflare R2 bucket and keys configured
- [ ] AI provider API keys configured

---

## Useful Commands

```bash
# View logs
docker logs -f geolyt-api
docker logs -f geolyt-jobs

# Run migrations manually
bun /app/packages/db/src/migrate.ts

# Push schema changes (development only)
bun run db:push
```
