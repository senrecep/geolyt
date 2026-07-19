# Geolyt

Static GEO (Generative Engine Optimization) analysis service. Submit a URL, get a scored report showing how visible your site is across AI search engines — ChatGPT, Perplexity, Gemini, Google AI Overviews, and more.

## What It Does

Geolyt fetches and analyzes any website, then scores it across six dimensions:

| Dimension | Weight | What It Measures |
|---|---|---|
| AI Citability | 25% | How likely AI systems are to quote your content |
| Brand Authority | 20% | Presence on Wikipedia, YouTube, Reddit, and similar platforms |
| Content Quality | 20% | E-E-A-T signals, readability, freshness |
| Technical Foundation | 15% | SSR, crawlability, security headers, canonical tags |
| Structured Data | 10% | JSON-LD schema coverage and validity |
| Platform Optimization | 10% | Readiness for specific AI platforms |

The output is a GEO Score (0–100), a prioritized list of findings, and a PDF report.

## Features

- **Deterministic scoring** — no AI cost for 70% of the GEO Score (citability, crawler access, technical SEO, schema, llms.txt)
- **AI synthesis** — E-E-A-T judgment, executive summary, and prioritized findings via Gemini (with Anthropic fallback)
- **PDF reports** — branded PDFs stored on Cloudflare R2, with public shareable links and OG meta tags
- **White-label** — per-client branding, custom dashboard colors/logo, and CNAME custom-domain support
- **Stripe billing** — metered usage, monthly quotas, and subscription lifecycle webhooks
- **Monthly deltas** — re-audit scheduler and score-change reports for ongoing clients
- **Observability** — OpenTelemetry tracing, cost dashboard, and crawl-failure alerting
- **Security** — SSRF protection, private-IP redirect blocking, and per-domain rate limiting

## Stack

- **Runtime:** Bun
- **API:** Elysia
- **Database:** PostgreSQL + Drizzle ORM
- **Queue:** BullMQ + Redis
- **AI:** Vercel AI SDK — Gemini 3.x (Google Cloud)
- **Scraping:** Self-hosted Firecrawl
- **Frontend:** Next.js 16
- **Storage:** Cloudflare R2
- **Error handling:** [tsentials](https://github.com/senrecep/tsentials) — Railway-oriented programming

## Development

### Prerequisites

- Bun ≥ 1.1
- Docker (for Postgres, Redis, Firecrawl)

### Setup

```bash
git clone https://github.com/senrecep/geolyt.git
cd geolyt

# Install dependencies
bun install

# Configure environment
cp .env.example .env
# then edit .env — at minimum:
#   BETTER_AUTH_SECRET   at least 32 characters
#   API_PORT=4000        the Next.js dev server takes 3000
#   GEOLYT_API_URL / NEXT_PUBLIC_GEOLYT_API_URL  → http://localhost:4000

# Start infrastructure (postgres + redis required; firecrawl optional)
docker compose up -d postgres redis

# Apply the database schema
bun run db:push

# Start all services (API :4000, jobs worker, dashboard :3000)
bun run dev
```

Check it works: `curl http://localhost:4000/health` should return `{"status":"ok",...}`,
then open `http://localhost:3000` to sign up and submit your first audit.
Swagger lives at `http://localhost:4000/docs`.

Optional keys: without `GOOGLE_AI_API_KEY` audits still complete (template synthesis,
E-E-A-T skipped with a finding). Markdown reports work without Cloudflare R2, but
**PDF reports require the `CLOUDFLARE_R2_*` variables** and a local Chromium
(`bunx playwright install chromium`).

### Commands

| Command | Description |
|---|---|
| `bun run dev` | Start API, workers, and frontend |
| `bun run worker` | Start only the jobs worker |
| `bun run build` | Build all packages |
| `bun run test` | Run test suite (uses the local Postgres/Redis) |
| `bun run lint` | Lint with Biome |
| `bun run typecheck` | TypeScript check |
| `bun run db:push` | Apply schema to the local database (development) |
| `bun run db:migrate` | Run migration files (what production runs on startup) |

### Project Structure

```
packages/
  shared/    — Zod schemas, error types, shared constants
  core/      — Deterministic GEO scorers (no LLM)
  ai-core/   — Gemini synthesis layer (Vercel AI SDK)
  api/       — Elysia REST API
  jobs/      — BullMQ workers
  web/       — Next.js dashboard
```

## Deployment

Production runs on a VDS with [Dokploy](https://dokploy.com) (Docker Compose + Traefik):

- [docs/deploy.md](docs/deploy.md) — local Docker stack and step-by-step Dokploy setup (infra + app stacks, env vars, first-deploy checklist)
- [docs/ssl-domains.md](docs/ssl-domains.md) — DNS records, Let's Encrypt certificates, renewal and troubleshooting
- [docs/cname-setup.md](docs/cname-setup.md) — white-label custom domains for agency clients

## Error Handling

All functions return `Result<T>` from [tsentials](https://github.com/senrecep/tsentials). No exceptions, no silent failures.

```typescript
import { fromAsync } from "tsentials/result"

const result = await fromAsync(collectPage(url))
  .andThen(page => scoreAll(page))
  .match(
    audit => saveAudit(audit),
    errors => saveFailedAudit(errors),
  )
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).
