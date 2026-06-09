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

## Stack

- **Runtime:** Bun
- **API:** Elysia
- **Database:** PostgreSQL + Drizzle ORM
- **Queue:** BullMQ + Redis
- **AI:** Vercel AI SDK v5 — Gemini 3.x (Google Cloud)
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

# Start infrastructure
docker compose up -d

# Run database migrations
bun run db:migrate

# Start all services
bun run dev
```

### Commands

| Command | Description |
|---|---|
| `bun run dev` | Start API, workers, and frontend |
| `bun run build` | Build all packages |
| `bun run test` | Run test suite |
| `bun run lint` | Lint with Biome |
| `bun run typecheck` | TypeScript check |
| `bun run db:migrate` | Run database migrations |

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
