import { describe, expect, it } from 'bun:test'
import type { AuditResult } from '@geolyt/shared'
import { calculateScoreChange } from '../../deltas/calculate-delta.js'

function makeAudit(scores: AuditResult['scores']): AuditResult {
  return {
    auditId: '550e8400-e29b-41d4-a716-446655440000',
    url: 'https://example.com',
    status: 'completed',
    scores,
    findings: [],
    crawlerAccess: [],
    generatedAt: new Date(),
    aiSynthesisUsed: false,
  }
}

describe('calculateScoreChange', () => {
  it('computes positive and negative score deltas', () => {
    const auditA = makeAudit({
      aiCitability: 40,
      brandAuthority: 30,
      contentQuality: 50,
      technicalFoundation: 60,
      structuredData: 70,
      platformOptimization: 55,
      composite: 52,
    })

    const auditB = makeAudit({
      aiCitability: 55,
      brandAuthority: 30,
      contentQuality: 45,
      technicalFoundation: 65,
      structuredData: 70,
      platformOptimization: 60,
      composite: 55,
    })

    const delta = calculateScoreChange(auditA, auditB)
    expect(delta.composite).toBe(3)
    expect(delta.aiCitability).toBe(15)
    expect(delta.brandAuthority).toBe(0)
    expect(delta.contentQuality).toBe(-5)
    expect(delta.technicalFoundation).toBe(5)
    expect(delta.structuredData).toBe(0)
    expect(delta.platformOptimization).toBe(5)
  })
})
