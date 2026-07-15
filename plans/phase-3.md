# Phase 3 — Production

**Duration:** 8 weeks  
**Goal:** White-label + billing + monthly deltas + public report links + hardening  
**Status:** [-] In progress | **Prerequisite:** Phase 2 complete | **Started:** 2026-07-15

## Acceptance Criteria

- [ ] White-label client can use custom domain + branded PDF
- [ ] Stripe metered billing charges per audit
- [ ] Monthly delta reports show score change vs previous audit
- [x] Public shareable report link works as lead-gen
- [x] SSRF protection blocks private IP ranges
- [x] Per-domain rate limiting enforced (no IP ban risk)

## Tasks

### White-label
- [x] `clients.white_label_config` JSONB column in Drizzle schema
- [x] Next.js theme injection from client config (logo, colors)
- [ ] Custom domain / CNAME resolution middleware
- [ ] CNAME setup docs for agency clients
- [x] Branded PDF via custom CSS in Playwright
- **Owner:** Kimi Code CLI | **Date:** 2026-07-15

### Billing (Stripe)
- [x] Stripe metered billing integration
- [x] Usage tracking in `usage` table (AI tokens attributed to client)
- [ ] Webhook handlers (subscription events)
- [x] Quota enforcement in POST /audits (429 when exceeded)
- **Owner:** Kimi Code CLI | **Date:** 2026-07-15

### geo-compare (monthly deltas)
- [x] `audit_deltas` Drizzle table (audit_a, audit_b, score_change JSONB)
- [x] Delta calculation helper in core
- [x] `GET /sites/:id/deltas` and `POST /sites/:id/deltas` endpoints
- [x] Scheduled re-audits (Bun cron)
- [x] Delta report template: "Score improved from 42 to 67 (+25 pts)"
- **Owner:** Kimi Code CLI | **Date:** 2026-07-15

### Public report links
- [x] Unauthenticated `/reports/:shareToken` route
- [x] Share token generation on audit complete
- [ ] OG meta tags for social sharing (score badge)
- **Owner:** — | **Date:** —

### Security hardening
- [x] SSRF: block 10.x, 172.16.x, 192.168.x, 127.x in collectPage()
- [x] Redirect validation: target must stay on same domain
- [x] Per-domain rate limiter (Redis token bucket, 1 req/sec)
- [ ] Secret scan pre-commit hook (grep for API keys in staged files)
- **Owner:** — | **Date:** —

### Observability
- [x] OpenTelemetry traces (collect/score/synthesize/report latency)
- [x] Cost dashboard (AI tokens per audit per model)
- [ ] Crawl failure alerting (>20% 403 rate)
- **Owner:** Kimi Code CLI | **Date:** 2026-07-15

### Billing (Stripe)
- `packages/api/src/billing/stripe.ts` — Stripe client and usage reporting helpers
- `packages/api/src/billing/quota.ts` — monthly quota check helpers

## Files Created This Phase

### Observability
- `packages/shared/src/observability/tracing.ts` — OpenTelemetry tracer wrapper (`withSpan`, `getTracer`, `setTracer`)
- `packages/shared/src/__tests__/observability/tracing.test.ts` — tests for span attributes
- `packages/api/src/tracing.ts` — API service NodeSDK initializer with OTLP HTTP exporter
- `packages/jobs/src/tracing.ts` — jobs service NodeSDK initializer with OTLP HTTP exporter
- `packages/api/src/routes/usage.ts` — `GET /usage` endpoint for AI token and cost summary
- `packages/api/src/__tests__/usage.test.ts` — tests for the usage endpoint

### Security hardening
- `packages/core/src/collectors/fetch-html.ts` — redirect validation (same domain + private IP block)
- `packages/jobs/src/rate-limit.ts` — per-domain Redis token bucket helper

### Public report links
- `packages/api/src/routes/reports.ts` — `/reports/share/:token` endpoint

### Billing (Stripe)
- `packages/api/src/billing/stripe.ts` — Stripe client and usage reporting helpers
- `packages/api/src/billing/quota.ts` — monthly quota check helpers

### White-label
- `packages/shared/src/schemas/white-label.ts` — WhiteLabelConfig Zod schema
- `packages/api/src/routes/clients.ts` — GET /clients/me and PATCH /clients/me/white-label

### geo-compare (monthly deltas)
- `packages/shared/src/schemas/audit-delta.ts` — AuditDelta and ScoreChange schemas
- `packages/core/src/deltas/calculate-delta.ts` — score change calculator
- `packages/api/src/routes/sites.ts` — sites delta endpoints
- `packages/jobs/src/scheduler/monthly-audit.ts` — monthly re-audit scheduler
- `packages/jobs/src/scheduler/runner.ts` — Bun.cron runner
- `packages/jobs/src/templates/delta.html.ts` — monthly delta HTML report template

### Modified this phase
- `packages/shared/src/errors/geo-errors.ts` — added `GEO.RedirectBlocked`
- `packages/db/src/schema.ts` — added `reports.shareToken`, `clients` billing and white-label columns, `audits.clientId`
- `packages/jobs/src/workers/report.ts` — generates share token on report complete, loads client white-label config
- `packages/api/src/routes/audits.ts` — quota enforcement and Stripe usage reporting
- `packages/jobs/src/templates/report.html.ts` — branded PDF with logo, company name, and primary color
- `packages/web/app/layout.tsx` — fetch client config and inject CSS variables/favicon
- `packages/web/app/_components/header.tsx` — accept logo and company name props

## Known Blockers

> None at start — requires Phase 2 complete
