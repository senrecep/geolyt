# geolyt — Claude Code Reference

> Full rules: **AGENTS.md** | Full plan: **PROJECT_PLAN.md** | Phases: **plans/**

## What

GEO (Generative Engine Optimization) analysis SaaS. Analyzes websites, scores AI visibility (0-100), generates PDF reports. TypeScript monorepo, Bun workspaces.

## Commands

| Task | Command |
|---|---|
| Dev (all) | `bun run dev` |
| Build | `bun run build` |
| Test | `bun run test` |
| Lint | `bun run lint` |
| Typecheck | `bun run typecheck` |
| DB migrate | `bun run db:migrate` |
| Worker | `bun run worker` |

## Architecture (Quick)

```
packages/shared  → Zod schemas + tsentials GeoErr
packages/core    → Deterministic scorers (Result<T>, no LLM)
packages/ai-core → Gemini synthesis (Vercel AI SDK v5)
packages/api     → Elysia REST (POST /audits, GET /audits/:id)
packages/jobs    → BullMQ workers (collect→score→synthesize→report)
packages/web     → Next.js 16 dashboard
```

## Non-negotiable Rules

1. **tsentials always** — `Result<T>` / `ResultAsync<T>`, never `try/catch`, never throw
2. **Scorers are deterministic** — no AI in `packages/core`
3. **AI models:** `@ai-sdk/google` only (NOT `@ai-sdk/google-vertex`)
   - Scoring: `gemini-3.1-flash-lite` → `gemini-2.5-flash-lite`
   - Synthesis: `gemini-3.5-flash` → `gemini-3.1-pro-preview` → `claude-haiku-4-5`
4. **Biome** for lint/format — no ESLint, no Prettier
5. **Bun test** — no Vitest, no Jest
6. **One session = one task** — see AGENTS.md §Session Management

## Don't

- No `try/catch` — use `Result.try()` or `fromAsync()`
- No `console.log` — use structured logger (pino)
- No `any` type — use `unknown` + type guard
- No `gemini-2.0-*` — shut down June 2026
- No `@ai-sdk/google-vertex` — Vertex SDK drops Gemini after June 2026
- No stub implementations (`return null`, `return {}`, TODO placeholders)
- No over-engineering — no abstractions beyond what the phase requires
- No AI in `packages/core` scorers
- No pnpm — Bun workspaces only

## Key Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/*` | better-auth session endpoints |
| POST | `/audits` | Start an audit (enqueues BullMQ pipeline) |
| GET | `/audits/:id` | Fetch audit status and result |
| GET | `/audits/:id/stream` | SSE progress stream |
| GET | `/reports/:id` | Download PDF report |
| GET | `/reports/share/:token` | Public shareable report landing page |
| GET | `/usage` | AI token usage and cost metrics |
| PATCH | `/clients/me/white-label` | Update white-label config |
| GET | `/clients/lookup` | Resolve custom-domain white-label config |
| POST | `/webhooks/stripe` | Stripe webhook handler |
| POST | `/sites/:id/deltas` | Create monthly delta report |
| GET | `/sites/:id/deltas` | List delta reports for a site |

## Context Management

- Compact at **40%** context fill
- Each session: read `plans/index.md` first to understand current phase
- One task per session — complete and verify before closing
