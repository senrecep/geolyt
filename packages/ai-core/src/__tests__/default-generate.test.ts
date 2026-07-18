import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { AuditResult } from '@geolyt/shared'
import type { LanguageModel } from 'ai'
import { Result } from 'tsentials/result'

// Exercises the real `defaultGenerate` wired into synthesize()/judgeEeat() —
// unlike synthesis.test.ts/eeat-judge.test.ts, which inject a fake `generate`
// and never touch this code path. Mocking the 'ai' module lets us assert what
// defaultGenerate actually sends to generateObject and how it parses the reply.

interface CapturedCall {
  model: LanguageModel
  providerOptions?: Record<string, Record<string, unknown>> | undefined
}

const calls: CapturedCall[] = []
let cachedContentTokenCount = 5_500

function fakeModel(modelId: string): LanguageModel {
  return { modelId } as unknown as LanguageModel
}

mock.module('ai', () => ({
  generateObject: mock(async (args: CapturedCall) => {
    calls.push({ model: args.model, providerOptions: args.providerOptions })
    return {
      object: {
        executiveSummary: 'Summary',
        findings: [],
        aiSynthesisUsed: true,
        score: 80,
      },
      usage: { promptTokens: 6_000, completionTokens: 800, totalTokens: 6_800 },
      response: {
        id: 'resp-1',
        modelId: args.model.modelId,
        timestamp: new Date(),
        body: {
          usageMetadata: {
            promptTokenCount: 6_000,
            candidatesTokenCount: 800,
            cachedContentTokenCount,
          },
        },
      },
    }
  }),
}))

const { synthesize } = await import('../synthesis.js')
const { judgeEeat } = await import('../eeat-judge.js')

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
    findings: [],
    crawlerAccess: [],
    generatedAt: new Date(),
    aiSynthesisUsed: false,
  }
}

describe('defaultGenerate cached-token extraction', () => {
  beforeEach(() => {
    calls.length = 0
    cachedContentTokenCount = 5_500
  })

  it('reads cachedContentTokenCount from the raw response body', async () => {
    const result = await synthesize(validAudit(), fakeModel('gemini-3.1-pro-preview'))
    if (!Result.isSuccess(result)) {
      throw new Error('expected synthesis to succeed')
    }
    expect(result.value.usage.cachedPromptTokens).toBe(5_500)
    expect(result.value.usage.promptTokens).toBe(6_000)
    expect(result.value.usage.completionTokens).toBe(800)
  })

  it('defaults to zero cached tokens when the API reports none', async () => {
    cachedContentTokenCount = 0
    const result = await synthesize(validAudit(), fakeModel('gemini-3.1-pro-preview'))
    if (!Result.isSuccess(result)) {
      throw new Error('expected synthesis to succeed')
    }
    expect(result.value.usage.cachedPromptTokens).toBe(0)
  })
})

describe('defaultGenerate thinking tier wiring', () => {
  beforeEach(() => {
    calls.length = 0
  })

  it('uses the minimal thinking budget for flash-tier synthesis models', async () => {
    await synthesize(validAudit(), fakeModel('gemini-3.5-flash'))
    expect(calls[0]?.providerOptions?.google).toEqual({ thinkingConfig: { thinkingBudget: 128 } })
  })

  it('uses the low thinking budget for pro-tier synthesis models', async () => {
    await synthesize(validAudit(), fakeModel('gemini-3.1-pro-preview'))
    expect(calls[0]?.providerOptions?.google).toEqual({ thinkingConfig: { thinkingBudget: 1024 } })
  })

  it('uses the minimal thinking budget for eeat scoring models', async () => {
    const pageData = {
      url: 'https://example.com/guide',
      finalUrl: 'https://example.com/guide',
      html: '<html></html>',
      title: 'A guide',
      metaDescription: null,
      contentBlocks: [],
      headings: [],
      structuredData: [],
      robots: null,
      llmsTxt: null,
      headers: {},
      canonical: null,
      contentInRawHtml: true,
      collectedAt: new Date(),
    }
    await judgeEeat(pageData, fakeModel('gemini-3.1-flash-lite'))
    expect(calls[0]?.providerOptions?.google).toEqual({ thinkingConfig: { thinkingBudget: 128 } })
  })
})
