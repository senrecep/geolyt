import { describe, expect, it } from 'bun:test'
import type { PageData } from '@geolyt/shared'
import type { LanguageModel } from 'ai'
import { Result } from 'tsentials/result'
import { type EeatGenerateObjectArgs, type EeatOutput, judgeEeat } from '../eeat-judge.js'

const fakeModel = { modelId: 'claude-haiku-test' } as unknown as LanguageModel

function validPageData(): PageData {
  return {
    url: 'https://example.com/guide',
    finalUrl: 'https://example.com/guide',
    html: '<html><body><h2>Introduction</h2><p>This guide is based on five years of field work.</p></body></html>',
    title: 'A guide',
    metaDescription: 'A useful guide.',
    contentBlocks: [
      {
        id: 'intro',
        tag: 'p',
        headings: [{ level: 2, text: 'Introduction' }],
        text: 'This guide is based on five years of field work.',
        wordCount: 10,
        hasStats: false,
        hasQuote: false,
      },
    ],
    headings: [{ level: 2, text: 'Introduction' }],
    structuredData: [],
    robots: null,
    llmsTxt: null,
    headers: {},
    canonical: null,
    contentInRawHtml: true,
    collectedAt: new Date(),
  }
}

function fakeGenerate(object: EeatOutput) {
  return async (_args: EeatGenerateObjectArgs): Promise<{ object: EeatOutput }> => {
    return { object }
  }
}

describe('judgeEeat', () => {
  it('returns AI score and findings when generation succeeds', async () => {
    const output: EeatOutput = {
      score: 72,
      findings: [
        {
          code: 'EEAT.NoAuthorBio',
          title: 'Missing author bio',
          description: 'No author information is visible.',
          severity: 'medium',
          recommendation: 'Add a byline and author bio.',
        },
      ],
    }

    const result = await judgeEeat(validPageData(), fakeModel, fakeGenerate(output))
    if (!Result.isSuccess(result)) {
      throw new Error('expected E-E-A-T judge to succeed')
    }
    expect(result.value.score).toBe(72)
    expect(result.value.findings[0]?.code).toBe('EEAT.NoAuthorBio')
  })

  it('returns a failure when generation throws', async () => {
    const failingGenerate = async (
      _args: EeatGenerateObjectArgs,
    ): Promise<{ object: EeatOutput }> => {
      throw new Error('rate limited')
    }

    const result = await judgeEeat(validPageData(), fakeModel, failingGenerate)
    if (!Result.isFailure(result)) {
      throw new Error('expected E-E-A-T judge to fail')
    }
    expect(result.errors[0]?.code).toBe('AI.EeatJudgeFailed')
  })
})
