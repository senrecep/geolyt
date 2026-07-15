import { describe, expect, it } from 'bun:test'
import type { AuditDelta, AuditResult } from '@geolyt/shared'
import { buildDeltaReportHtml } from '../../templates/delta.html.js'

function makeAudit(id: string, composite: number): AuditResult {
  return {
    auditId: id,
    url: 'https://example.com',
    status: 'completed',
    scores: {
      aiCitability: 40,
      brandAuthority: 50,
      contentQuality: 60,
      technicalFoundation: 70,
      structuredData: 80,
      platformOptimization: 55,
      composite,
    },
    findings: [],
    crawlerAccess: [],
    generatedAt: new Date('2026-07-15T00:00:00.000Z'),
    aiSynthesisUsed: false,
  }
}

describe('buildDeltaReportHtml', () => {
  it('renders the summary with composite score change', () => {
    const auditA = makeAudit('audit-a', 50)
    const auditB = makeAudit('audit-b', 67)
    const delta: AuditDelta = {
      id: 'delta-1',
      siteId: 'site-1',
      auditAId: 'audit-a',
      auditBId: 'audit-b',
      scoreChange: {
        composite: 17,
        aiCitability: 0,
        brandAuthority: 0,
        contentQuality: 0,
        technicalFoundation: 0,
        structuredData: 0,
        platformOptimization: 0,
      },
      createdAt: new Date(),
    }

    const html = buildDeltaReportHtml({ auditA, auditB, delta })
    expect(html).toContain('Score improved from 50 to 67 (+17 pts)')
    expect(html).toContain('Composite GEO Score')
    expect(html).toContain('Delta ID delta-1')
  })

  it('lists top improvements and regressions', () => {
    const auditA = makeAudit('audit-a', 50)
    const auditB: AuditResult = {
      ...makeAudit('audit-b', 60),
      scores: {
        ...auditA.scores,
        composite: 60,
        aiCitability: 55,
        contentQuality: 50,
      },
    }
    const delta: AuditDelta = {
      id: 'delta-2',
      siteId: 'site-1',
      auditAId: 'audit-a',
      auditBId: 'audit-b',
      scoreChange: {
        composite: 10,
        aiCitability: 15,
        brandAuthority: 0,
        contentQuality: -10,
        technicalFoundation: 0,
        structuredData: 0,
        platformOptimization: 0,
      },
      createdAt: new Date(),
    }

    const html = buildDeltaReportHtml({ auditA, auditB, delta })
    expect(html).toContain('AI Citability: +15 pts')
    expect(html).toContain('Content Quality: -10 pts')
  })
})
