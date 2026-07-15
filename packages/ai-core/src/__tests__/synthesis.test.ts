import { describe, expect, it } from 'bun:test'
import type { AiUsage, AuditResult } from '@geolyt/shared'
import type { LanguageModel } from 'ai'
import { Result } from 'tsentials/result'
import { type GenerateObjectArgs, type SynthesisOutput, synthesize } from '../synthesis.js'

const fakeModel = { modelId: 'gemini-test' } as unknown as LanguageModel

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
    crawlerAccess: [
      { name: 'GPTBot', tier: 1, allowed: true },
      { name: 'ClaudeBot', tier: 1, allowed: true },
    ],
    generatedAt: new Date(),
    aiSynthesisUsed: false,
  }
}

function fakeGenerate(object: SynthesisOutput) {
  return async (
    _args: GenerateObjectArgs,
  ): Promise<{ object: SynthesisOutput; usage: AiUsage }> => {
    return {
      object,
      usage: { promptTokens: 6_000, completionTokens: 800, cachedPromptTokens: 5_500 },
    }
  }
}

describe('synthesize', () => {
  it('returns AI output when generation succeeds', async () => {
    const output: SynthesisOutput = {
      executiveSummary: 'The page needs canonical and structured data work.',
      findings: [
        {
          code: 'AI.AddCanonical',
          title: 'Add canonical tag',
          description: 'AI crawlers may see duplicate content.',
          severity: 'high',
          recommendation: 'Add rel=canonical.',
        },
      ],
      aiSynthesisUsed: true,
    }

    const result = await synthesize(validAudit(), fakeModel, fakeGenerate(output))
    if (!Result.isSuccess(result)) {
      throw new Error('expected synthesis to succeed')
    }
    expect(result.value.output.executiveSummary).toBe(output.executiveSummary)
    expect(result.value.output.aiSynthesisUsed).toBe(true)
  })

  it('returns a failure when generation throws', async () => {
    const failingGenerate = async (
      _args: GenerateObjectArgs,
    ): Promise<{ object: SynthesisOutput; usage: AiUsage }> => {
      throw new Error('model refused')
    }

    const result = await synthesize(validAudit(), fakeModel, failingGenerate)
    if (!Result.isFailure(result)) {
      throw new Error('expected synthesis to fail')
    }
    expect(result.errors[0]?.code).toBe('AI.SynthesisFailed')
  })
})
