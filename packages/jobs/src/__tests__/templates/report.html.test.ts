import { describe, expect, it } from 'bun:test'
import type { AuditResult } from '@geolyt/shared'
import { buildReportHtml } from '../../templates/report.html.js'

function validAudit(): AuditResult {
  return {
    auditId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    url: 'https://example.com',
    status: 'completed',
    scores: {
      aiCitability: 55,
      brandAuthority: 0,
      contentQuality: 0,
      technicalFoundation: 80,
      structuredData: 70,
      platformOptimization: 60,
      composite: 52,
    },
    findings: [
      {
        code: 'GEO.NoCanonical',
        title: 'Missing canonical tag',
        description: 'Page does not declare a canonical URL.',
        severity: 'high',
        recommendation: 'Add a rel=canonical link.',
      },
    ],
    crawlerAccess: [],
    generatedAt: new Date('2026-07-14T00:00:00.000Z'),
    aiSynthesisUsed: false,
  }
}

describe('buildReportHtml', () => {
  it('includes the URL and composite score', () => {
    const html = buildReportHtml(validAudit())
    expect(html).toContain('https://example.com')
    expect(html).toContain('52/100')
  })

  it('lists findings with severity and recommendation', () => {
    const html = buildReportHtml(validAudit())
    expect(html).toContain('Missing canonical tag')
    expect(html).toContain('high')
    expect(html).toContain('Add a rel=canonical link.')
  })
})
