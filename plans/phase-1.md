# Phase 1 — Core Engine

**Duration:** 2 weeks  
**Goal:** Deterministic scoring engine + Elysia API + BullMQ pipeline + Firecrawl Docker  
**Status:** 🔴 Not started

## Acceptance Criteria

- [ ] `POST /audits` returns 202 with audit_id
- [ ] `GET /audits/:id` returns status + result when complete
- [ ] Citability scorer output matches Python original within ±5 points (parity test)
- [ ] 403 response from Firecrawl → audit continues with `GEO.CrawlerBlocked` finding
- [ ] `electron-srl.com` golden test produces valid AuditResult JSON

## Tasks

### Week 1

#### Scaffold
- [ ] `package.json` root with Bun workspaces (packages/*)
- [ ] `biome.json` with strict TypeScript rules
- [ ] `tsconfig.base.json` (strict, exactOptionalPropertyTypes, noUncheckedIndexedAccess)
- [ ] `docker-compose.yml` (postgres:16-alpine, redis:7-alpine, firecrawl)
- [ ] All 6 `packages/*/package.json` with correct deps
- **Owner:** — | **Date:** —

#### packages/shared
- [ ] `src/schemas/audit-result.ts` — Zod: AuditResult, GeoScores, Finding, CrawlerAccess
- [ ] `src/schemas/page-data.ts` — Zod: PageData, ContentBlock, HeadingSchema
- [ ] `src/schemas/audit-job.ts` — Zod: AuditJobInput, CollectResult, ScoreResult
- [ ] `src/errors/geo-errors.ts` — GeoErr factory (tsentials Err)
- [ ] `src/constants/crawlers.ts` — 14 AI crawlers with tiers
- [ ] `src/constants/weights.ts` — all scoring weights
- **Owner:** — | **Date:** —

#### packages/core — Collectors
- [ ] `src/collectors/fetch-html.ts` — plain fetch (no JS) + Playwright fallback trigger
- [ ] `src/collectors/collect-page.ts` — Firecrawl → ResultAsync<PageData>
- [ ] `src/collectors/collect-robots.ts` — robots.txt → ResultAsync<string|null>
- [ ] `src/collectors/collect-llmstxt.ts` — llms.txt → ResultAsync<string|null>
- [ ] `src/collectors/segment-blocks.ts` — Cheerio → ContentBlock[] (H2/H3 segmentation)
- **Owner:** — | **Date:** —

### Week 2

#### packages/core — Scorers
- [ ] `src/scorers/citability.ts` — 5-dim scorer (Answer 30/Self 25/Struct 20/Stats 15/Unique 10)
- [ ] `src/scorers/robots-access.ts` — 14 crawlers, tier-weighted (50/25/15/10)
- [ ] `src/scorers/technical.ts` — 8 technical categories, Rule Engine
- [ ] `src/scorers/schema-org.ts` — JSON-LD validation, Rule Engine
- [ ] `src/scorers/llms-txt.ts` — presence + format validation
- [ ] `src/scorers/composite.ts` — GEO Score formula (weighted sum)
- [ ] `tests/parity/citability-golden.json` — Python parity fixtures
- **Owner:** — | **Date:** —

#### packages/api
- [ ] `src/index.ts` — Elysia app with swagger + cors + better-auth
- [ ] `src/routes/audits.ts` — POST /audits, GET /audits/:id, GET /audits/:id/report
- [ ] `src/db/schema.ts` — Drizzle: clients, sites, audits, audit_results, reports, usage
- [ ] `src/db/migrate.ts` — migration runner
- **Owner:** — | **Date:** —

#### packages/jobs
- [ ] `src/queues.ts` — BullMQ queue definitions + FlowProducer
- [ ] `src/workers/collect.ts` — Firecrawl → CollectResult (ResultAsync)
- [ ] `src/workers/score.ts` — 6 scorers → ScoreResult (ResultAsync)
- [ ] `src/workers/synthesize.ts` — template fallback report (no AI in Phase 1)
- [ ] `src/workers/report.ts` — markdown template → save to disk/R2
- [ ] `src/flow.ts` — enqueueAudit() FlowProducer wiring
- **Owner:** — | **Date:** —

## Files Created This Phase

> Fill in as work progresses

| File | Package | Description |
|---|---|---|
| — | — | — |

## Known Blockers

> None at start

## Notes

- Python citability_scorer.py is the reference — run it on fixtures first to generate golden JSON
- Self-hosted Firecrawl: `docker compose up firecrawl` — test with `curl http://localhost:3002/v1/scrape`
- Template report (no AI) must produce a valid AuditResult — AI is Phase 2
