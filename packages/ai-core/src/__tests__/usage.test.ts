import { describe, expect, it } from 'bun:test'
import { calculateCacheHitRate, estimateCost, extractCachedPromptTokens } from '../usage.js'

describe('estimateCost', () => {
  it('costs less than $0.10 for a typical cached audit synthesis', () => {
    const usage = {
      promptTokens: 6_000,
      completionTokens: 800,
      cachedPromptTokens: 5_500,
    }

    expect(estimateCost(usage)).toBeLessThan(0.1)
  })

  it('returns zero when no tokens are used', () => {
    const usage = {
      promptTokens: 0,
      completionTokens: 0,
      cachedPromptTokens: 0,
    }

    expect(estimateCost(usage)).toBe(0)
  })

  it('treats cached tokens as cheaper than uncached tokens', () => {
    const cached = {
      promptTokens: 10_000,
      completionTokens: 0,
      cachedPromptTokens: 10_000,
    }
    const uncached = {
      promptTokens: 10_000,
      completionTokens: 0,
      cachedPromptTokens: 0,
    }

    expect(estimateCost(cached)).toBeLessThan(estimateCost(uncached))
  })
})

describe('estimateCost with a model', () => {
  const usage = { promptTokens: 1_000_000, completionTokens: 1_000_000, cachedPromptTokens: 0 }

  it('prices gemini-2.5-pro higher than gemini-2.5-flash-lite', () => {
    expect(estimateCost(usage, 'gemini-2.5-pro')).toBeGreaterThan(
      estimateCost(usage, 'gemini-2.5-flash-lite'),
    )
  })

  it('falls back to flash-lite pricing for an unknown model', () => {
    expect(estimateCost(usage, 'some-unknown-model')).toBe(
      estimateCost(usage, 'gemini-2.5-flash-lite'),
    )
  })

  it('matches the no-model default for backward compatibility', () => {
    expect(estimateCost(usage)).toBe(estimateCost(usage, 'gemini-2.5-flash-lite'))
  })
})

describe('extractCachedPromptTokens', () => {
  it('reads cachedContentTokenCount from a Gemini raw response body', () => {
    const body = { usageMetadata: { promptTokenCount: 100, cachedContentTokenCount: 42 } }
    expect(extractCachedPromptTokens(body)).toBe(42)
  })

  it('returns 0 when usageMetadata is missing', () => {
    expect(extractCachedPromptTokens({})).toBe(0)
  })

  it('returns 0 for a non-object response body', () => {
    expect(extractCachedPromptTokens(undefined)).toBe(0)
    expect(extractCachedPromptTokens(null)).toBe(0)
    expect(extractCachedPromptTokens('raw text')).toBe(0)
  })

  it('returns 0 when cachedContentTokenCount is not a number', () => {
    const body = { usageMetadata: { cachedContentTokenCount: 'not-a-number' } }
    expect(extractCachedPromptTokens(body)).toBe(0)
  })
})

describe('calculateCacheHitRate', () => {
  it('returns 0 when there are no prompt tokens', () => {
    expect(
      calculateCacheHitRate({
        promptTokens: 0,
        completionTokens: 100,
        cachedPromptTokens: 0,
      }),
    ).toBe(0)
  })

  it('returns 1 when all prompt tokens are cached', () => {
    expect(
      calculateCacheHitRate({
        promptTokens: 1_000,
        completionTokens: 100,
        cachedPromptTokens: 1_000,
      }),
    ).toBe(1)
  })

  it('returns the cached ratio for partial cache hits', () => {
    expect(
      calculateCacheHitRate({
        promptTokens: 1_000,
        completionTokens: 100,
        cachedPromptTokens: 800,
      }),
    ).toBe(0.8)
  })
})
