# Geolyt — Master Plan

> Converting `github.com/zubair-trabzada/geo-seo-claude` (Claude Code plugin) into a standalone TypeScript SaaS.  
> Status: Planning | Last updated: 2026-06-09

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

**70% Deterministic (no AI cost):**
- Citability: 5-dim (Answer 30% / Self-containment 25% / Structure 20% / Stats 15% / Uniqueness 10%)
- Crawler access: 14 AI crawlers, tier-weighted (50%/25%/15%/10%)
- Technical SEO: 8 categories (SSR, robots, canonical, security headers, etc.)
- Schema.org: JSON-LD validation via Rule Engine
- llms.txt: presence + validity check

**30% AI (Gemini, cached prompt):**
- E-E-A-T quality judgment
- Executive summary
- Findings narrative
- Content rewrite suggestions

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
| 1 — Core Engine | 2 weeks | Deterministic scorers + Elysia API + BullMQ + Firecrawl | 🔴 Not started |
| 2 — AI + Dashboard | 4 weeks | Gemini synthesis + Next.js UI + PDF + R2 | 🔴 Not started |
| 3 — Production | 8 weeks | White-label + Stripe + deltas + public links | 🔴 Not started |

See `plans/` directory for detailed phase breakdowns.
