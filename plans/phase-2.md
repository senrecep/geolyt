# Phase 2 — AI + Dashboard

**Duration:** 4 weeks  
**Goal:** Gemini synthesis + Next.js dashboard + PDF reports + Cloudflare R2  
**Status:** [-] In progress | **Prerequisite:** Phase 1 complete | **Started:** 2026-07-14

## Acceptance Criteria

- [x] AI synthesis produces executive summary + findings with Gemini
- [ ] Prompt caching verified (cache hit rate > 80% under load)
- [ ] Cost per audit < $0.10 (measure actual AI token usage)
- [x] Next.js dashboard shows audit list + score gauges + findings
- [x] PDF report generates and uploads to Cloudflare R2
- [x] Public report link works (unauthenticated GET /reports/:id)

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
- [x] Replace Phase 1 template with real AI synthesis
- [x] Gemini thinkingLevel: 'minimal' for Flash, 'low' for Pro
- [x] On AI failure: fall back to template report (ai_synthesis_used: false)
- **Owner:** Kimi Code CLI | **Date:** 2026-07-14

### packages/jobs — report worker (PDF)
- [x] `src/workers/report.ts` — Playwright page.pdf() from HTML template
- [x] `src/templates/report.html.ts` — HTML template for PDF
- [x] R2 upload via @aws-sdk/client-s3
- [x] Public URL generation
- **Owner:** Kimi Code CLI | **Date:** 2026-07-14

### packages/jobs — score worker (E-E-A-T integration)
- [x] `src/workers/score.ts` — call `judgeEeat()` with primary scoring model
- [x] Recalculate composite score including `contentQuality`
- [x] Add findings for missing AI key or judge failure without failing the audit
- **Owner:** Kimi Code CLI | **Date:** 2026-07-14

### packages/web (Next.js 16 dashboard)
- [x] Next.js app router scaffold + Tailwind v4 + path aliases
- [x] Auth pages (login, signup) via better-auth client
- [x] Dashboard: audit list with GEO scores + status badges
- [x] Audit detail: score breakdown gauges, findings list, crawler access table
- [x] Submit URL form → POST /audits
- [x] Report viewer: embedded PDF + markdown toggle
- [x] Progress polling or SSE for submitted audits
- [x] better-auth backend integration on the API (sessions for dashboard routes)
- **Owner:** Kimi Code CLI | **Date:** 2026-07-14

### Brand mention APIs (packages/core)
- [x] `src/collectors/brand-apis.ts` — Wikipedia API + Wikidata API (real calls)
- [x] YouTube Data API v3 (real calls when `YOUTUBE_DATA_API_KEY` is set)
- [x] Reddit JSON API (public search endpoint)
- [x] Redis cache (7-day TTL, brand data changes slowly)
- **Owner:** Kimi Code CLI | **Date:** 2026-07-14

## Files Created This Phase

### packages/ai-core
- `src/models.ts` — Google and Anthropic provider factories
- `src/provider-chain.ts` — circuit-breaker model chain
- `src/synthesis.ts` — Gemini object generation for audit narratives
- `src/eeat-judge.ts` — E-E-A-T content quality judge
- `src/prompts/rubric.ts`, `src/prompts/evidence.ts`, `src/prompts/eeat-rubric.ts`
- `src/__tests__/models.test.ts`, `provider-chain.test.ts`, `synthesis.test.ts`, `eeat-judge.test.ts`

### packages/core
- `src/collectors/brand-apis.ts` — Wikipedia, Wikidata, YouTube, Reddit brand scanners
- `src/__tests__/collectors/brand-apis.test.ts`
- `src/score-all.ts` — orchestrates deterministic GEO scoring

### packages/jobs
- `src/pdf/generate-pdf.ts` — Playwright PDF generation
- `src/storage/r2.ts` — Cloudflare R2 upload helper
- `src/templates/report.html.ts` — PDF HTML template
- `src/__tests__/storage/r2.test.ts`, `templates/report.html.test.ts`

### packages/web
- `app/layout.tsx`, `app/globals.css`, `app/page.tsx`
- `app/login/page.tsx`, `app/signup/page.tsx`
- `app/audits/[id]/page.tsx`
- `app/_components/header.tsx`, `submit-form.tsx`, `audit-list.tsx`, `score-badge.tsx`, `status-badge.tsx`
- `app/_actions/submit-audit.ts`
- `lib/auth.ts`, `lib/api.ts`
- `src/__tests__/components/*.test.tsx`, `actions/submit-audit.test.ts`, `lib/api.test.ts`
- `postcss.config.mjs`, `next.config.ts`, `test-setup.ts`

### Modified in this phase
- `packages/jobs/src/workers/synthesize.ts` — wired to real AI synthesis
- `packages/jobs/src/workers/report.ts` — generates PDF and uploads to R2
- `packages/jobs/src/workers/score.ts` — integrated brand authority and E-E-A-T scoring
- `.env.example` — added AI, R2, auth, dashboard, and YouTube API key placeholders

## Known Blockers

> None at start — requires Phase 1 complete
