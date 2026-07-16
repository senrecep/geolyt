# geolyt — Agent Guide

> Works with: Claude Code, OpenAI Codex, Gemini CLI, Kilo Code, Cursor, Copilot  
> Quick ref: **CLAUDE.md** | Plan: **PROJECT_PLAN.md** | Phases: **plans/**

---

## 1. Project Overview

GEO (Generative Engine Optimization) analysis SaaS. Static website analysis + AI scoring + PDF report generation.

**Goal:** Charge $49-$499/mo per client for automated GEO audits.  
**Deploy:** Personal VDS + Dokploy (Docker Compose). Near-zero running cost.

---

## 2. Repository Structure

```
geolyt/
├── packages/
│   ├── shared/        # @geolyt/shared   — Zod schemas, tsentials GeoErr, shared types
│   ├── core/          # @geolyt/core     — Deterministic scorers (NO AI, NO LLM)
│   ├── ai-core/       # @geolyt/ai-core  — Gemini synthesis (Vercel AI SDK v5)
│   ├── api/           # @geolyt/api      — Elysia REST API + Swagger
│   ├── jobs/          # @geolyt/jobs     — BullMQ workers (4 stages)
│   └── web/           # @geolyt/web      — Next.js 16 dashboard
├── .claude/
│   ├── settings.json  # Hooks (lint, secret scan, commit format)
│   ├── skills/        # Project-specific skills
│   └── agents/        # Sub-agent definitions
├── plans/
│   ├── index.md       # Phase tracking (READ THIS FIRST each session)
│   ├── phase-1.md     # Core Engine
│   ├── phase-2.md     # AI + Dashboard
│   └── phase-3.md     # Production
├── docker-compose.yml
├── biome.json
├── CLAUDE.md          # Claude Code quick ref (< 100 lines)
├── AGENTS.md          # This file
└── PROJECT_PLAN.md    # Full architectural plan
```

---

## 3. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Runtime | Bun | NOT Node.js |
| API | Elysia | NOT Express/Hono/Fastify |
| ORM | Drizzle + postgres | NOT Prisma |
| Queue | BullMQ + ioredis | 4-stage FlowProducer |
| Auth | better-auth | self-hosted JWT |
| Error handling | tsentials | Result<T>, AppError, Rule Engine |
| AI | Vercel AI SDK v5 (@ai-sdk/google) | NOT @ai-sdk/google-vertex |
| Scraping | Self-hosted Firecrawl + @mendable/firecrawl-js | Docker on VDS |
| Frontend | Next.js 16 | Tailwind v4 |
| Storage | Cloudflare R2 | S3-compatible, @aws-sdk/client-s3 |
| Linter | Biome | NOT ESLint + Prettier |
| Package mgr | Bun workspaces | NOT pnpm, NOT npm |
| Deploy | Dokploy (VDS) | Docker Compose |

### AI Models

```typescript
// packages/ai-core/src/models.ts
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createAnthropic }          from "@ai-sdk/anthropic"

const google    = createGoogleGenerativeAI({ apiKey: env.GOOGLE_AI_API_KEY })
const anthropic = createAnthropic()

// Scoring — fast, high-volume
export const scoringModels = [
  google("gemini-3.1-flash-lite"),   // PRIMARY (GCP credits)
  google("gemini-2.5-flash-lite"),   // fallback
]

// Synthesis — quality narrative
export const narrativeModels = [
  google("gemini-3.5-flash"),        // PRIMARY
  google("gemini-3.1-pro-preview"),  // deeper reasoning
  google("gemini-2.5-pro"),          // stable fallback
  anthropic("claude-haiku-4-5"),     // Vercel credits, last resort
]
```

> ❌ **DEAD:** `gemini-2.0-flash` shut down June 1 2026.  
> ❌ **DON'T USE:** `@ai-sdk/google-vertex` — Vertex AI SDK drops Gemini after June 2026.

---

## 4. tsentials Patterns (MANDATORY)

All functions MUST return `Result<T>` or `ResultAsync<T>`. Never throw, never use `try/catch`.

### Import paths

```typescript
import { Result, fromAsync, chain }   from "tsentials/result"
import { Err, AppError }              from "tsentials/errors"
import { Maybe, tryFirst }            from "tsentials/maybe"
import { RuleEngine }                 from "tsentials/rules"
import type { Rule }                  from "tsentials/rules"
```

### Result<T> — core pattern

```typescript
// CORRECT — errors as values
function divide(a: number, b: number): Result<number> {
  if (b === 0) return Result.failure(Err.validation("Math.DivideByZero", "Cannot divide by zero"))
  return Result.success(a / b)
}

// WRONG — never do this
function divide(a: number, b: number): number {
  if (b === 0) throw new Error("Cannot divide by zero")  // ❌
  return a / b
}
```

### Async pipeline

```typescript
// One await at the end — chain builds synchronously
const result = await fromAsync(fetchUser(userId))
  .andThen(user => validateUser(user))      // andThen() NOT then()
  .ensure(user => user.isActive, Err.validation("User.Inactive", "Not active"))
  .map(user => user.profile)
  .match(
    profile => profile,
    errors  => null,
  )
```

### Rule Engine for GEO checks

```typescript
import type { Rule } from "tsentials/rules"

const hasSSR: Rule<PageData> = ctx =>
  ctx.contentInRawHtml
    ? Result.ok()
    : Result.failure(Err.validation("GEO.JsRenderedOnly",
        "Content requires JavaScript — AI crawlers cannot read this page"))

const hasCanonical = RuleEngine.fromPredicate<PageData>(
  p => p.canonical !== null,
  Err.validation("GEO.NoCanonical", "Missing canonical tag"),
)

export const technicalRules = RuleEngine.and(hasSSR, hasCanonical)
```

### Critical naming rules (from tsentials docs)

- `ResultAsync.andThen()` — NOT `.then()` (breaks PromiseLike protocol)
- `ResultChain.bind()` — NOT `.then()` (same reason)
- `error.description` — NOT `.message` (AppError uses `description`)
- `Result.then()` — sync monadic bind on static namespace (intentionally `then`)

### GeoErr error codes

```typescript
// packages/shared/src/errors/geo-errors.ts
import { Err } from "tsentials/errors"

export const GeoErr = {
  crawlerBlocked:   (url: string) => Err.forbidden("GEO.CrawlerBlocked", `Server blocks AI crawlers: ${url}`),
  fetchTimeout:     (url: string) => Err.unexpected("GEO.FetchTimeout", `Unreachable: ${url}`),
  noContent:        ()            => Err.validation("GEO.NoContent", "Insufficient text content"),
  jsRenderedOnly:   ()            => Err.validation("GEO.JsRenderedOnly", "Content requires JavaScript"),
  noStructuredData: ()            => Err.validation("GEO.NoStructuredData", "No JSON-LD schema found"),
  noLlmsTxt:        ()            => Err.validation("GEO.NoLlmsTxt", "Missing llms.txt"),
  noCanonical:      ()            => Err.validation("GEO.NoCanonical", "Missing canonical tags"),
  lowCitability:    (n: number)   => Err.validation("GEO.LowCitability", `Citability score: ${n}/100`),
}
```

---

## 5. Scoring Rules

**packages/core is AI-FREE.** Scorers are deterministic functions.

### Citability weights (from geo-seo-claude source)
- Answer block quality: **30%**
- Self-containment: **25%**
- Structural readability: **20%**
- Statistical density: **15%**
- Uniqueness signals: **10%**

### GEO composite weights
- AI Citability & Visibility: **25%**
- Brand Authority Signals: **20%**
- Content Quality & E-E-A-T: **20%**
- Technical Foundations: **15%**
- Structured Data: **10%**
- Platform Optimization: **10%**

### AI crawler tiers
- Tier 1 (50%): GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot
- Tier 2 (25%): Google-Extended, Applebot-Extended, Amazonbot, FacebookBot
- Tier 3 (remaining): CCBot, Bytespider, cohere-ai, anthropic-ai

---

## 6. BullMQ Pipeline

```typescript
// Concurrency settings (from packages/jobs/src/workers/)
collect:    { concurrency: 5  }   // I/O-bound, Firecrawl calls
score:      { concurrency: 20 }   // CPU-bound, pure TS scoring
synthesize: { concurrency: 3  }   // Rate-limited by AI API
report:     { concurrency: 4  }   // Playwright PDF rendering

// FlowProducer wiring (report ← synthesize ← score ← collect)
// Each worker returns ResultAsync<StageOutput>
// On failure: save partial result, mark audit degraded — never crash
```

---

## 7. Drizzle Schema Conventions

```typescript
// packages/api/src/db/schema/
// - snake_case column names
// - uuid primary keys: id: uuid('id').primaryKey().defaultRandom()
// - timestamps: createdAt + completedAt
// - JSONB for full AuditResult: data: jsonb('data').$type<AuditResult>()
// - Denormalize hot-query fields (geoScore: integer) alongside JSONB

// Never use Prisma. Never use TypeORM.
```

---

## 8. Elysia API Conventions

```typescript
// packages/api/src/routes/audits.ts
import { Elysia, t } from "elysia"
import { fromAsync } from "tsentials/result"

// Route handlers return Result-wrapped values
// Use t.Object() for request body validation
// Use @elysiajs/swagger for OpenAPI generation
// Auth via better-auth middleware
```

---

## 9. Session Management (Token Efficiency)

> Article principle: "Context is currency. Quality degrades at 20-40% context fill."

### Session start protocol
1. Read `plans/index.md` — understand current phase and task
2. Read only the files needed for your specific task
3. Do NOT read the full codebase — use targeted `grep`/`glob`

### Session discipline
- **One session = one task** (one feature, one bug fix, one phase step)
- Compact at **40%** context fill
- Use `/clear` when switching to a different task
- Save progress to `plans/index.md` before ending session

### Token-efficient patterns
- Read `packages/shared/src/schemas/` before implementing (prevents duplicate types)
- Check `packages/core/src/constants/` for magic numbers (crawler names, weights)
- Use `grep` before `read` — target specific symbols
- Don't re-read files you've already read in the same session

### Model routing (cost control)
- **Haiku/Flash-Lite**: simple file edits, type exports, small fixes
- **Sonnet/Flash**: standard implementation, tests, bug fixes
- **Opus/Pro**: architecture decisions, complex refactoring, security review

---

## 10. Memory & Progress Tracking

### plans/index.md
The single source of truth for project progress. Update at:
- Start of session (read current state)
- Task completion (mark done, note what changed)
- Session end (save next steps)

### Phase structure
Each `plans/phase-N.md` contains:
- Task checklist with owner and date
- Acceptance criteria per task
- Files created/modified
- Known blockers

### Cross-session memory pattern
```
Session start → read plans/index.md + plans/phase-N.md
Do work → implement one task
Session end → update plans/index.md with: task completed, files changed, next task
```

---

## 11. Testing Conventions

```bash
bun test                    # run all tests
bun test packages/core      # run specific package
bun test --watch            # watch mode
```

- Test files: `src/__tests__/foo.test.ts` mirrors `src/foo.ts`
- **No mocking of database or Firecrawl** — use test containers or golden fixtures
- **Citability scorer**: must have parity test against Python original (golden JSON in `packages/core/tests/parity/`)
- Every scorer function must have tests before the phase is marked complete

---

## 12. Git Conventions

```
feat(scope): description      # new feature
fix(scope): description       # bug fix
refactor(scope): description  # no behavior change
test(scope): description      # test additions
docs(scope): description      # documentation only
chore(scope): description     # build, config, tooling
```

Scopes: `api`, `core`, `ai-core`, `jobs`, `web`, `shared`, `deploy`, `docs`

---

## 13. Security Rules

- No hardcoded secrets — use env vars, `.env` files in `.gitignore`
- SSRF protection in `collectPage()` — block private IP ranges
- Per-domain rate limiting in collect worker (1 req/sec, respect robots.txt crawl-delay)
- API keys hashed in database, never stored plain
- Cloudflare WAF as first line — only public API exposed

---

## 14. Don't List

- ❌ `try/catch` — use `Result.try()` or `fromAsync()`
- ❌ `console.log` — use pino logger
- ❌ `any` type — use `unknown` + type guard
- ❌ `gemini-2.0-*` — shut down June 2026
- ❌ `@ai-sdk/google-vertex` — dropping Gemini after June 2026
- ❌ LLM calls in `packages/core` — scorers must be deterministic
- ❌ Prisma, TypeORM — Drizzle only
- ❌ Express, Hono, Fastify — Elysia only
- ❌ pnpm/npm — Bun workspaces only
- ❌ ESLint/Prettier — Biome only
- ❌ Stub implementations — no `return null`, no TODOs in code
- ❌ Over-engineering — implement only what the current phase requires
- ❌ Reading the whole codebase at session start — targeted reads only

---

## 15. Cloudflare R2 Storage

```typescript
// Report upload pattern
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

const r2 = new S3Client({
  region: "auto",
  endpoint: env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId:     env.CLOUDFLARE_R2_ACCESS_KEY,
    secretAccessKey: env.CLOUDFLARE_R2_SECRET_KEY,
  },
})

// Key pattern: reports/{auditId}/geo-report.pdf
// Public URL: env.CLOUDFLARE_R2_PUBLIC_BASE_URL + "/" + key
```

---

## 16. Self-Hosted Firecrawl

```typescript
import FirecrawlApp from "@mendable/firecrawl-js"

const firecrawl = new FirecrawlApp({
  apiUrl: env.FIRECRAWL_URL,  // http://firecrawl:3002 (Docker internal)
  apiKey: "self-hosted",      // no key needed for self-hosted
})

// 403 response → Result.failure(GeoErr.crawlerBlocked(url))
// Not a crash — becomes a scored Critical finding in the report
```

Docker service: `ghcr.io/mendableai/firecrawl:latest`  
Includes Playwright for JS rendering. No Fire-engine (Cloudflare bypass) on self-hosted.

---

## 17. Pre-commit Secret Scan

The hook at `.githooks/pre-commit` runs `bun run secret-scan` against staged files.

```bash
# Run manually
bun run secret-scan
```

Covered patterns live in `scripts/secret-scan.ts`:
- Stripe `sk_live_`, `sk_test_`, `rk_` keys
- OpenAI `sk-...`, Anthropic `sk-ant-...`, Google `AIza...`
- Cloudflare API tokens
- Generic `api_key` / `secret_key` assignments

`.env.example` and `*.test.ts` files are ignored. If a match is found, the commit is blocked until the secret is removed or the file is added to the ignore list with a documented reason.

---

## 18. OpenTelemetry Tracing

Initialize tracing early in each service entry point:

```typescript
// packages/api/src/index.ts or packages/jobs/src/index.ts
import { initTracing } from './tracing'
initTracing('geolyt-api') // or 'geolyt-jobs'
```

The `NodeSDK` is only started when `OTEL_EXPORTER_OTLP_ENDPOINT` is set. Traces export via OTLP/HTTP. The shared tracer is available through `@geolyt/shared` for manual spans inside workers and route handlers.

---

## 19. Stripe Webhooks

Webhook handler is in `packages/api/src/billing/webhooks.ts`. It expects the raw request body to be verified by the caller using `STRIPE_WEBHOOK_SECRET`.

Handled event types:
- `checkout.session.completed` → stores `stripeCustomerId`, `stripeSubscriptionId`, `plan`, `monthlyQuota`
- `customer.subscription.updated` → updates `plan` and `monthlyQuota` based on status
- `customer.subscription.deleted` → resets plan to `free` and clears quota

Return a `ResultAsync<void>`; do not throw. Log failures and return `500` only for unexpected errors so Stripe retries.

---

## 20. White-Label Custom Domains (CNAME)

Agency clients can point their own subdomain to the Geolyt dashboard. The full setup guide is in `docs/cname-setup.md`.

Quick flow:
1. Client creates a CNAME record: `dashboard.client.com` → `app.geolyt.io`
2. Reverse proxy terminates TLS and forwards the `Host` header.
3. `packages/web/middleware.ts` calls `GET /clients/lookup?domain=dashboard.client.com`.
4. API matches `clients.white_label_config->>'domain'` and returns the config.
5. Middleware stores the config in the `x-geolyt-white-label` cookie (24h).
6. `app/layout.tsx` reads the cookie and applies branding.

Always match the exact hostname (no scheme, no trailing slash, no port). Test locally by editing `/etc/hosts` before asking a client to update DNS.

---

## 21. Deployment

See `docs/deploy.md` for the full guide.

Quick reference:

```bash
# Local infrastructure
docker compose up -d

# Local full stack
docker compose -f docker-compose.yml -f docker-compose.app.yml up -d --build

# Dokploy production
#   - Infra: docker-compose.infra.dokploy.yml
#   - App:   docker-compose.app.dokploy.yml
#   - Or single-stack: docker-compose.dokploy.yml
```

Build targets:
- `packages/api/Dockerfile`  → `packages/api/dist/server.js`
- `packages/web/Dockerfile`  → Next.js standalone output
- `packages/jobs/Dockerfile` → `packages/jobs/dist/main.js`

The API container runs migrations on startup via `packages/api/docker-entrypoint.sh`. For Dokploy first deploy, run migrations manually from the `api` console:

```bash
bun /app/packages/db/src/migrate.ts
```
