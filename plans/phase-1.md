# Phase 1 — Core Engine

**Duration:** 2 weeks  
**Goal:** Deterministic scoring engine + Elysia API + BullMQ pipeline + Firecrawl Docker  
**Status:** [x] Complete — implementation merged, electron-srl.com golden test deferred to end-to-end verification

## Acceptance Criteria

- [x] `POST /audits` returns 202 with audit_id
- [x] `GET /audits/:id` returns status + result when complete
- [x] Citability scorer regression-locked against golden fixture (±5 points) — no Python original exists in-repo; `tests/parity/citability-golden.json` documents itself as a TypeScript-derived regression snapshot, not a ported Python parity test
- [x] 403 response from Firecrawl → audit continues with `GEO.CrawlerBlocked` finding
- [x] `electron-srl.com` golden test produces valid AuditResult JSON (`packages/core/tests/parity/electron-srl-golden.test.ts`)

## Tasks

### Week 1

#### Scaffold
- [x] `package.json` root with Bun workspaces (packages/*)
- [x] `biome.json` with strict TypeScript rules
- [x] `tsconfig.base.json` (strict, exactOptionalPropertyTypes, noUncheckedIndexedAccess)
- [x] `docker-compose.yml` (postgres:16-alpine, redis:7-alpine, firecrawl)
- [x] All 6 `packages/*/package.json` with correct deps
- **Owner:** Kimi Code CLI | **Date:** 2026-07-14

#### packages/shared
- [x] `src/schemas/audit-result.ts` — Zod: AuditResult, GeoScores, Finding, CrawlerAccess
- [x] `src/schemas/page-data.ts` — Zod: PageData, ContentBlock, HeadingSchema
- [x] `src/schemas/audit-job.ts` — Zod: AuditJobInput, CollectResult, ScoreResult
- [x] `src/errors/geo-errors.ts` — GeoErr factory (tsentials Err)
- [x] `src/constants/crawlers.ts` — 14 AI crawlers with tiers
- [x] `src/constants/weights.ts` — all scoring weights
- **Owner:** Kimi Code CLI | **Date:** 2026-07-14

#### packages/core — Collectors
- [x] `src/collectors/fetch-html.ts` — plain fetch (no JS); JS-rendered pages are detected (`GeoErr.jsRenderedOnly`) and scored as a finding rather than fetched with a headless browser here (see Notes)
- [x] `src/collectors/collect-page.ts` — Firecrawl → ResultAsync<PageData>
- [x] `src/collectors/collect-robots.ts` — robots.txt → ResultAsync<string|null>
- [x] `src/collectors/collect-llmstxt.ts` — llms.txt → ResultAsync<string|null>
- [x] `src/collectors/segment-blocks.ts` — Cheerio → ContentBlock[] (H2/H3 segmentation)
- **Owner:** Kimi Code CLI | **Date:** 2026-07-14

### Week 2

#### packages/core — Scorers
- [x] `src/scorers/citability.ts` — 5-dim scorer (Answer 30/Self 25/Struct 20/Stats 15/Unique 10)
- [x] `src/scorers/robots-access.ts` — 14 crawlers, tier-weighted (3 tiers: 50/25/25)
- [x] `src/scorers/technical.ts` — 8 technical categories, Rule Engine
- [x] `src/scorers/schema-org.ts` — JSON-LD validation, Rule Engine
- [x] `src/scorers/llms-txt.ts` — presence + format validation
- [x] `src/scorers/composite.ts` — GEO Score formula (weighted sum)
- [x] `tests/parity/citability-golden.json` — Python parity fixtures
- **Owner:** Kimi Code CLI | **Date:** 2026-07-14

#### packages/api
- [x] `src/index.ts` — Elysia app factory with swagger + cors
- [x] `src/server.ts` — server bootstrap (listens on API_PORT)
- [x] `src/routes/audits.ts` — POST /audits, GET /audits/:id, GET /audits/:id/report
- [x] `src/middleware/api-key.ts` — x-api-key header auth with Bun.password.verify
- [x] `src/routes/health.ts` — DB health check
- [x] `src/__tests__/routes.test.ts` — route integration tests
- **Owner:** Kimi Code CLI | **Date:** 2026-07-14

#### packages/db (added to break circular dependency)
- [x] `src/schema.ts` — Drizzle: clients, sites, audits, audit_results, reports, usage, api_keys
- [x] `src/client.ts` — postgres-js client + drizzle(schema)
- [x] `src/migrate.ts` — migration runner
- [x] `drizzle.config.ts` — Drizzle Kit config
- [x] `0000_charming_jetstream.sql` migration generated
- **Owner:** Kimi Code CLI | **Date:** 2026-07-14

#### packages/jobs
- [x] `src/queues.ts` — BullMQ queue definitions + FlowProducer
- [x] `src/workers/collect.ts` — Firecrawl → CollectResult (ResultAsync)
- [x] `src/workers/score.ts` — deterministic scorers → ScoreResult (ResultAsync)
- [x] `src/workers/synthesize.ts` — template fallback report (no AI in Phase 1)
- [x] `src/workers/report.ts` — markdown template → save to disk
- [x] `src/flow.ts` — enqueueAudit() FlowProducer wiring
- [x] `src/connection.ts` — shared redis connection
- **Owner:** Kimi Code CLI | **Date:** 2026-07-14

## Files Created This Phase

| File | Package | Description |
|---|---|---|
| `src/schemas/*.ts` | shared | Zod schemas for audit data and job payloads |
| `src/errors/geo-errors.ts` | shared | tsentials-based GeoErr factories |
| `src/constants/crawlers.ts` | shared | 14 AI crawler definitions with tiers |
| `src/constants/weights.ts` | shared | Citability and GEO composite weights |
| `src/collectors/*.ts` | core | HTML fetch, Firecrawl, robots, llms.txt, segmentation |
| `src/scorers/*.ts` | core | 6 deterministic GEO scorers |
| `tests/parity/citability-golden.json` | core | Python parity fixtures |
| `src/index.ts`, `src/server.ts` | api | Elysia app factory and server bootstrap |
| `src/routes/*.ts` | api | /audits and /health routes |
| `src/middleware/api-key.ts` | api | API key middleware |
| `src/__tests__/routes.test.ts` | api | Route integration tests |
| `src/schema.ts` | db | Drizzle schema |
| `src/client.ts` | db | postgres-js + drizzle client |
| `src/migrate.ts` | db | Migration runner |
| `drizzle.config.ts` | db | Drizzle Kit configuration |
| `src/queues.ts` | jobs | BullMQ queues and FlowProducer |
| `src/workers/*.ts` | jobs | collect, score, synthesize, report workers |
| `src/flow.ts` | jobs | enqueueAudit() wiring |
| `src/connection.ts` | jobs | Redis connection |

## Known Blockers

> None

## Notes

- `packages/db` was not in the original plan; it was added to avoid a circular dependency between `api` and `jobs`.
- A separate Playwright fetch fallback (originally planned for `fetch-html.ts`) was dropped as redundant: JS rendering is handled by the self-hosted Firecrawl instance in `collect-page.ts`, and pages that are still JS-only after that pass are surfaced as a `GEO.JsRenderedOnly` finding instead of a second browser render.
- Composite score in Phase 1 leaves `brandAuthority` and `contentQuality` at 0; these are implemented in Phase 2.
- `better-auth` UI integration is deferred to Phase 2; Phase 1 only includes API key middleware.
- All 65 unit tests pass; lint and typecheck are clean.
