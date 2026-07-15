# Phase 3 — Production

**Duration:** 8 weeks  
**Goal:** White-label + billing + monthly deltas + public report links + hardening  
**Status:** [-] In progress | **Prerequisite:** Phase 2 complete | **Started:** 2026-07-15

## Acceptance Criteria

- [ ] White-label client can use custom domain + branded PDF
- [ ] Stripe metered billing charges per audit
- [ ] Monthly delta reports show score change vs previous audit
- [ ] Public shareable report link works as lead-gen
- [x] SSRF protection blocks private IP ranges
- [x] Per-domain rate limiting enforced (no IP ban risk)

## Tasks

### White-label
- [ ] `clients.white_label_config` JSONB column in Drizzle schema
- [ ] Next.js theme injection from client config (logo, colors, domain)
- [ ] CNAME setup docs for agency clients
- [ ] Branded PDF via custom CSS in Playwright
- **Owner:** — | **Date:** —

### Billing (Stripe)
- [ ] Stripe metered billing integration
- [ ] Usage tracking in `usage` table (audits + AI tokens)
- [ ] Webhook handlers (subscription events)
- [ ] Quota enforcement in POST /audits (429 when exceeded)
- **Owner:** — | **Date:** —

### geo-compare (monthly deltas)
- [ ] `audit_deltas` Drizzle table (audit_a, audit_b, score_change JSONB)
- [ ] Celery beat / Bun cron: scheduled re-audits
- [ ] Delta report template: "Score improved from 42 to 67 (+25 pts)"
- **Owner:** — | **Date:** —

### Public report links
- [ ] Unauthenticated `/reports/:shareToken` route
- [ ] Share token generation on audit complete
- [ ] OG meta tags for social sharing (score badge)
- **Owner:** — | **Date:** —

### Security hardening
- [x] SSRF: block 10.x, 172.16.x, 192.168.x, 127.x in collectPage()
- [x] Redirect validation: target must stay on same domain
- [x] Per-domain rate limiter (Redis token bucket, 1 req/sec)
- [ ] Secret scan pre-commit hook (grep for API keys in staged files)
- **Owner:** — | **Date:** —

### Observability
- [ ] OpenTelemetry traces (collect/score/synthesize/report latency)
- [ ] Cost dashboard (AI tokens per audit per model)
- [ ] Crawl failure alerting (>20% 403 rate)
- **Owner:** — | **Date:** —

## Files Created This Phase

> Fill in as work progresses

## Known Blockers

> None at start — requires Phase 2 complete
