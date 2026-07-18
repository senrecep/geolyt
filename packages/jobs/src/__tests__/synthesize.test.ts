import { describe, expect, it } from 'bun:test'
import { buildSynthesisUsageRow } from '../workers/synthesize.js'

describe('buildSynthesisUsageRow', () => {
  it('records the audit id and model alongside token usage', () => {
    const row = buildSynthesisUsageRow({
      clientId: 'client-1',
      auditId: 'audit-1',
      modelId: 'gemini-3.5-flash',
      period: '2026-07',
      usage: {
        promptTokens: 1_500,
        cachedPromptTokens: 500,
        completionTokens: 300,
      },
    })

    expect(row).toEqual({
      clientId: 'client-1',
      auditId: 'audit-1',
      period: '2026-07',
      model: 'gemini-3.5-flash',
      aiTokensCached: 500,
      aiTokensUncached: 1_000,
      aiTokensOutput: 300,
    })
  })

  it('clamps uncached tokens to zero when cached tokens exceed prompt tokens', () => {
    const row = buildSynthesisUsageRow({
      clientId: null,
      auditId: 'audit-2',
      modelId: 'claude-haiku-4-5',
      period: '2026-07',
      usage: {
        promptTokens: 100,
        cachedPromptTokens: 150,
        completionTokens: 50,
      },
    })

    expect(row.aiTokensUncached).toBe(0)
    expect(row.clientId).toBeNull()
  })
})
