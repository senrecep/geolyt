import { describe, expect, test } from 'bun:test'
import { AuditResult } from '@geolyt/shared'
import { collectPage } from '../../src/collectors/collect-page.js'
import { scoreAll } from '../../src/score-all.js'

describe('electron-srl.com golden test', () => {
  test('produces a valid AuditResult JSON', async () => {
    const collected = await collectPage('https://electron-srl.com').toResult()
    if (!collected.ok) {
      throw new Error(collected.errors.map((e) => e.description).join(', '))
    }

    const scored = scoreAll(collected.value)
    if (!scored.ok) {
      throw new Error(scored.errors.map((e) => e.description).join(', '))
    }

    const auditResult = AuditResult.parse({
      auditId: '00000000-0000-0000-0000-000000000000',
      url: 'https://electron-srl.com',
      status: 'completed',
      scores: scored.value.scores,
      findings: scored.value.findings,
      crawlerAccess: scored.value.crawlerAccess,
      generatedAt: new Date().toISOString(),
    })

    const json = JSON.stringify(auditResult)
    expect(json).toBeTruthy()
    expect(auditResult.scores.composite).toBeGreaterThanOrEqual(0)
    expect(auditResult.scores.composite).toBeLessThanOrEqual(100)
  }, 30000)
})
