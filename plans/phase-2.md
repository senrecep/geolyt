# Phase 2 — AI + Dashboard

**Duration:** 4 weeks  
**Goal:** Gemini synthesis + Next.js dashboard + PDF reports + Cloudflare R2  
**Status:** [-] In progress | **Prerequisite:** Phase 1 complete | **Started:** 2026-07-14

## Acceptance Criteria

- [ ] AI synthesis produces executive summary + findings with Gemini
- [ ] Prompt caching verified (cache hit rate > 80% under load)
- [ ] Cost per audit < $0.10 (measure actual AI token usage)
- [ ] Next.js dashboard shows audit list + score gauges + findings
- [ ] PDF report generates and uploads to Cloudflare R2
- [ ] Public report link works (unauthenticated GET /reports/:id)

## Tasks

### packages/ai-core
- [x] `src/models.ts` — @ai-sdk/google provider, model routing
- [x] `src/provider-chain.ts` — waterfall with circuit breaker (ioredis health tracking)
- [x] `src/prompts/rubric.ts` — ~6k token cached GEO rubric (static, all audits)
- [x] `src/prompts/evidence.ts` — per-audit evidence builder (variable part)
- [x] `src/synthesis.ts` — generateObject() + cache_control ephemeral breakpoint
- [x] `src/eeat-judge.ts` — Haiku-based E-E-A-T scoring
- [ ] Cost verification test: assert cached vs uncached token difference
- **Owner:** Kimi Code CLI | **Date:** 2026-07-14

### packages/jobs — synthesize worker (AI)
- [ ] Replace Phase 1 template with real AI synthesis
- [ ] Gemini thinkingLevel: 'minimal' for Flash, 'low' for Pro
- [ ] On AI failure: fall back to template report (ai_synthesis_used: false)
- **Owner:** — | **Date:** —

### packages/jobs — report worker (PDF)
- [x] `src/workers/report.ts` — Playwright page.pdf() from HTML template
- [x] `src/templates/report.html.ts` — HTML template for PDF
- [x] R2 upload via @aws-sdk/client-s3
- [x] Public URL generation
- **Owner:** Kimi Code CLI | **Date:** 2026-07-14

### packages/web (Next.js 16 dashboard)
- [ ] Auth pages (login, signup) via better-auth
- [ ] Dashboard: audit list with GEO scores + status badges
- [ ] Audit detail: score breakdown gauges, findings list, crawler access table
- [ ] Report viewer: embedded PDF + markdown toggle
- [ ] Submit URL form → POST /audits → polling or SSE progress
- **Owner:** — | **Date:** —

### Brand mention APIs (packages/core)
- [ ] `src/collectors/brand-apis.ts` — Wikipedia API + Wikidata API (real calls)
- [ ] YouTube Data API v3 (replace stub implementation)
- [ ] Reddit JSON API (replace stub)
- [ ] Redis cache (7-day TTL, brand data changes slowly)
- **Owner:** — | **Date:** —

## Files Created This Phase

> Fill in as work progresses

## Known Blockers

> None at start — requires Phase 1 complete
