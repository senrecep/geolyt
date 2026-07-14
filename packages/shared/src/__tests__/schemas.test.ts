import { describe, expect, it } from 'bun:test'
import { CollectResult, ScoreResult } from '../schemas/audit-job.js'
import {
  AuditResult,
  AuditStatus,
  type CrawlerAccess,
  type Finding,
  type GeoScores,
} from '../schemas/audit-result.js'
import { ContentBlock, PageData } from '../schemas/page-data.js'

const validGeoScores: GeoScores = {
  aiCitability: 25,
  brandAuthority: 30,
  contentQuality: 40,
  technicalFoundation: 50,
  structuredData: 60,
  platformOptimization: 70,
  composite: 45,
}

const validFinding: Finding = {
  code: 'GEO.NoCanonical',
  title: 'Missing canonical tag',
  description: 'The page does not declare a canonical URL.',
  severity: 'high',
  recommendation: 'Add a canonical link tag.',
}

const validCrawlerAccess: CrawlerAccess = {
  name: 'GPTBot',
  tier: 1,
  allowed: true,
}

const validAuditResult: AuditResult = {
  auditId: '550e8400-e29b-41d4-a716-446655440000',
  url: 'https://example.com',
  status: 'completed',
  scores: validGeoScores,
  findings: [validFinding],
  crawlerAccess: [validCrawlerAccess],
  generatedAt: new Date(),
  aiSynthesisUsed: false,
}

const validPageData: PageData = {
  url: 'https://example.com',
  finalUrl: 'https://example.com',
  html: '<html><body><h1>Hello</h1></body></html>',
  title: 'Example',
  headings: [{ level: 1, text: 'Hello' }],
  contentBlocks: [
    {
      id: '1',
      tag: 'h1',
      headings: [{ level: 1, text: 'Hello' }],
      text: 'Hello',
      wordCount: 1,
      hasStats: false,
      hasQuote: false,
    },
  ],
  structuredData: [],
  headers: {},
  contentInRawHtml: true,
  collectedAt: new Date(),
}

describe('AuditResult schema', () => {
  it('accepts a valid audit result', () => {
    expect(() => AuditResult.parse(validAuditResult)).not.toThrow()
  })

  it('rejects an invalid status', () => {
    expect(() => AuditResult.parse({ ...validAuditResult, status: 'unknown' })).toThrow()
  })

  it('rejects a score outside 0-100', () => {
    expect(() =>
      AuditResult.parse({
        ...validAuditResult,
        scores: { ...validGeoScores, composite: 101 },
      }),
    ).toThrow()
  })
})

describe('PageData schema', () => {
  it('accepts valid page data', () => {
    expect(() => PageData.parse(validPageData)).not.toThrow()
  })

  it('rejects content block with negative word count', () => {
    expect(() =>
      ContentBlock.parse({
        id: '1',
        tag: 'p',
        headings: [],
        text: 'Hello',
        wordCount: -1,
      }),
    ).toThrow()
  })
})

describe('CollectResult schema', () => {
  it('accepts a valid collect result', () => {
    expect(() => CollectResult.parse({ pageData: validPageData })).not.toThrow()
  })
})

describe('ScoreResult schema', () => {
  it('accepts a valid score result', () => {
    expect(() =>
      ScoreResult.parse({
        scores: validGeoScores,
        findings: [validFinding],
        crawlerAccess: [validCrawlerAccess],
      }),
    ).not.toThrow()
  })
})

describe('AuditStatus schema', () => {
  it('accepts completed', () => {
    expect(AuditStatus.parse('completed')).toBe('completed')
  })

  it('rejects invalid status', () => {
    expect(() => AuditStatus.parse('archived')).toThrow()
  })
})
