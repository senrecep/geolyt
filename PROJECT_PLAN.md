# Geolyt — Master Plan

> Converting `github.com/zubair-trabzada/geo-seo-claude` (Claude Code plugin) into a standalone TypeScript SaaS.  
> Status: Phase 3 complete — core implementation ready for deployment | Last updated: 2026-07-16

## Vision

A GEO (Generative Engine Optimization) analysis service that analyzes any website statically, produces a GEO Score (0-100), and generates professional PDF reports — sold as a subscription service.

**Market:** $850M GEO market (2025) → $7.3B by 2031 (34% CAGR). Only 23% of marketers invest in GEO.

---

## Stack

| Layer | Technology |
|---|---|
| Runtime | Bun |
| API | Elysia + @elysiajs/swagger |
| ORM | Drizzle + postgres |
| Queue | BullMQ + ioredis |
| Auth | better-auth |
| Error handling | tsentials (Result<T>, AppError, Rule Engine) |
| AI | Vercel AI SDK v5 + @ai-sdk/google + @ai-sdk/anthropic |
| Scraping | Self-hosted Firecrawl (Docker) + @mendable/firecrawl-js |
| Frontend | Next.js 16 + Tailwind v4 |
| Storage | Cloudflare R2 (free tier, 10GB/mo) |
| CDN/Security | Cloudflare free tier (CDN + WAF + DDoS) |
| Linter | Biome |
| Package manager | Bun workspaces |
| Deploy | Dokploy on VDS |

### AI Models (Gemini — GCP credits)

| Role | Primary | Fallback |
|---|---|---|
| Fast scoring | `gemini-3.1-flash-lite` | `gemini-2.5-flash-lite` |
| Synthesis/narrative | `gemini-3.5-flash` | `gemini-3.1-pro-preview` → `gemini-2.5-pro` |
| Final fallback | `claude-haiku-4-5` (Vercel credits) | — |

> ⚠️ `gemini-2.0-flash` is DEAD (shutdown June 1 2026). Do not use.  
> Use `@ai-sdk/google` (NOT `@ai-sdk/google-vertex` — Vertex AI SDK drops Gemini support after June 2026).

---

## Architecture

### Monorepo Structure (Bun workspaces)

```
geolyt/
├── packages/
│   ├── shared/       # Zod schemas + tsentials GeoErr codes + types
│   ├── db/           # Drizzle schema + postgres-js client
│   ├── core/         # Deterministic scorers (Result<T>) — no LLM
│   ├── ai-core/      # Multi-provider AI synthesis (Vercel AI SDK)
│   ├── api/          # Elysia REST API
│   ├── jobs/         # BullMQ workers (4-stage pipeline)
│   └── web/          # Next.js 16 dashboard
├── docker-compose.yml
├── docker-compose.app.dokploy.yml
├── docker-compose.infra.dokploy.yml
├── biome.json
├── CLAUDE.md
├── AGENTS.md
├── PROJECT_PLAN.md
└── package.json      # Bun workspaces root
```

### BullMQ Pipeline (4 stages)

```
POST /audits → 202
     │
     ▼ FlowProducer
audit.collect (concurrency: 5)
     │  Firecrawl self-hosted → PageData[]
     ▼
audit.score (concurrency: 20)
     │  6 deterministic scorers → GeoScores
     ▼
audit.synthesize (concurrency: 3)
     │  AI narrative + findings → AuditResult
     ▼
audit.report (concurrency: 4)
     │  Playwright PDF → Cloudflare R2
     ▼
GET /audits/:id → completed result
```

### Scoring Architecture

GEO Score is a 6-dimension weighted composite (`GEO_COMPOSITE_WEIGHTS` in `packages/shared/src/constants/weights.ts`):

| Dimension | Weight | Source |
|---|---|---|
| AI Citability & Visibility | 25% | Deterministic (5-dim citability scorer) |
| Brand Authority Signals | 20% | Deterministic — Wikipedia/Wikidata/YouTube/Reddit lookups, Redis 7-day cache (`packages/core/src/collectors/brand-apis.ts`) |
| Content Quality & E-E-A-T | 20% | AI judge (Gemini) |
| Technical Foundations | 15% | Deterministic (8 categories: SSR, robots, canonical, security headers, etc.) |
| Structured Data | 10% | Deterministic (JSON-LD validation via Rule Engine) |
| Platform Optimization | 10% | Deterministic (llms.txt presence + validity) |

Only Content Quality (20% of the total) calls an AI model — the remaining 80% is deterministic, no-LLM scoring.

Citability sub-weights: Answer block 30% / Self-containment 25% / Structural readability 20% / Statistical density 15% / Uniqueness 10%.

Crawler access: 14 AI crawlers across 3 tiers, tier-weighted 50%/25%/25%.

**Cost per audit:** ~$0.03-0.08 (cached GEO rubric = ~6k tokens, constant across all audits)

### tsentials Error Philosophy

All functions return `Result<T>` or `ResultAsync<T>`. Never throw.

```typescript
// 403 blocked → finding, not crash
collectPage(url): ResultAsync<PageData>
  // Result.failure(GeoErr.crawlerBlocked(url)) → scored as Critical finding

// Rule Engine for GEO checks
const hasSSR: Rule<PageData> = ctx =>
  ctx.contentInRawHtml ? Result.ok()
    : Result.failure(GeoErr.jsRenderedOnly())
```

---

## Cost Analysis (Monthly, ~0 additional cost)

| Resource | Solution | Cost |
|---|---|---|
| AI scoring | Gemini Flash (GCP credits) | $0 |
| AI synthesis | Gemini Pro (GCP credits) | $0 |
| Scraping | Self-hosted Firecrawl (VDS Docker) | $0 |
| PDF storage | Cloudflare R2 (10GB free) | $0 |
| CDN/WAF | Cloudflare free tier | $0 |
| DB + Redis | VDS Docker (already running) | $0 |
| Hosting | VDS + Dokploy (existing) | $0 |

---

## Pricing Tiers

| Tier | Price | Audits/Mo | Report | Margin |
|---|---|---|---|---|
| Free | $0 | 1 (template, no AI) | MD | ~100% |
| Pro | $49/mo | 25 AI audits | PDF + MD | ~96% |
| Agency | $199/mo | 200 + white-label + batch | + API access | ~92% |
| White-label | $499+/mo | Unlimited | Custom branding | ~92% |

---

## Key References

| Project | URL | Role |
|---|---|---|
| geo-seo-claude | github.com/zubair-trabzada/geo-seo-claude | Source GEO analysis logic (Python) |
| tsentials | github.com/senrecep/tsentials | Error handling library |

---

## Phase Roadmap

| Phase | Duration | Goal | Status |
|---|---|---|---|
| 1 — Core Engine | 2 weeks | Deterministic scorers + Elysia API + BullMQ + Firecrawl | 🟢 Complete (2026-07-14) |
| 2 — AI + Dashboard | 4 weeks | Gemini synthesis + Next.js UI + PDF + R2 | 🟢 Complete (2026-07-15) |
| 3 — Production | 8 weeks | White-label + Stripe + deltas + public links | 🟢 Complete (2026-07-15) |

### Production additions beyond original plan

- Stripe billing (metered usage + webhooks)
- White-label + custom-domain CNAME resolution
- Monthly re-audit scheduler
- Crawl-failure alerting
- Per-domain rate limiting
- API-key auth
- OpenTelemetry tracing
- CI + backup + Dokploy deploy tooling

See `plans/` directory for detailed phase breakdowns.
