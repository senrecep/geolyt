import type { CollectResult, GeoScores, PageData, ScoreResult } from '@geolyt/shared'
import { GeoErr, crawlersInTier } from '@geolyt/shared'
import type { Result } from 'tsentials/result'

// Pure helpers for the degraded-audit path (AI crawlers blocked). Kept free of
// any BullMQ Worker wiring so they can be unit-tested without booting workers.

export type CollectOutcome =
  | { status: 'success' | 'blocked'; value: CollectResult }
  | { status: 'error'; codes: string[]; message: string }

// A crawler block (403 from the origin) is not fatal: the audit continues in a
// degraded mode so the report can still flag that the site denies AI crawlers
// and scores 0. Every other collection failure stays fail-fast.
export function resolveCollectOutcome(result: Result<PageData>): CollectOutcome {
  if (result.ok) {
    return {
      status: 'success',
      value: { pageData: result.value, blockedCrawlers: [], errors: [] },
    }
  }

  const codes = result.errors.map((error) => error.code)
  if (codes.includes('GEO.CrawlerBlocked')) {
    return {
      status: 'blocked',
      value: {
        pageData: null,
        blockedCrawlers: crawlersInTier(1).map((crawler) => crawler.name),
        errors: codes,
      },
    }
  }

  return {
    status: 'error',
    codes,
    message: result.errors.map((error) => `${error.code}: ${error.description}`).join(', '),
  }
}

const ZERO_SCORES: GeoScores = {
  aiCitability: 0,
  brandAuthority: 0,
  contentQuality: 0,
  technicalFoundation: 0,
  structuredData: 0,
  platformOptimization: 0,
  composite: 0,
}

// When the origin blocks AI crawlers there is no page to score, so the audit is
// finished in a degraded state: every dimension is 0 and a single critical
// finding explains the block and the remediation. This report is the lead-gen
// value ("your site is invisible to AI").
export function buildCrawlerBlockedScore(url: string): ScoreResult {
  const blocked = GeoErr.crawlerBlocked(url)
  return {
    scores: { ...ZERO_SCORES },
    findings: [
      {
        code: blocked.code,
        title: 'Site blocks AI crawlers',
        description: `${blocked.description}. AI assistants such as ChatGPT, Claude, and Perplexity cannot read this page, so it scores 0 for AI visibility.`,
        severity: 'critical',
        recommendation:
          'Allow AI crawler user-agents (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot) at the CDN/WAF and in robots.txt so generative engines can access and cite your content.',
      },
    ],
    crawlerAccess: [],
    degraded: true,
  }
}
