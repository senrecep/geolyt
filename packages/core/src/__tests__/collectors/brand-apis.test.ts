import { beforeEach, describe, expect, it } from 'bun:test'
import { Result } from 'tsentials/result'
import { type BrandAuthorityOutput, scoreBrandAuthority } from '../../collectors/brand-apis.js'

class FakeRedis {
  store = new Map<string, string>()

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null
  }

  async set(key: string, value: string, ..._args: (string | number)[]): Promise<void> {
    this.store.set(key, value)
  }
}

function fakeFetch(response: { wikipedia?: unknown; wikidata?: unknown }) {
  return async (url: string): Promise<Response> => {
    if (url.includes('wikipedia')) {
      return Response.json({
        query: { search: response.wikipedia ? [response.wikipedia] : [] },
      })
    }
    return Response.json({
      search: response.wikidata ? [response.wikidata] : [],
    })
  }
}

describe('scoreBrandAuthority', () => {
  beforeEach(() => {
    process.env.WIKIPEDIA_USER_AGENT = 'geolyt-test'
  })

  it('returns a high score when both Wikipedia and Wikidata mention the brand', async () => {
    const fetcher = fakeFetch({
      wikipedia: { title: 'Example Inc' },
      wikidata: { id: 'Q123', label: 'Example Inc' },
    })

    const result = await scoreBrandAuthority({ domain: 'example.com', fetcher })
    if (!Result.isSuccess(result)) {
      throw new Error('expected success')
    }
    expect(result.value.score).toBe(80)
    expect(result.value.mentions.length).toBe(2)
  })

  it('returns a low score and a finding when no mentions exist', async () => {
    const fetcher = fakeFetch({})

    const result = await scoreBrandAuthority({ domain: 'unknown.com', fetcher })
    if (!Result.isSuccess(result)) {
      throw new Error('expected success')
    }
    expect(result.value.score).toBe(10)
    expect(result.value.findings[0]?.code).toBe('BRAND.NoMentions')
  })

  it('returns cached result when redis has a value', async () => {
    const redis = new FakeRedis() as unknown as import('ioredis').Redis
    const cached: BrandAuthorityOutput = {
      score: 99,
      findings: [],
      mentions: [{ platform: 'wikipedia', title: 'Cached', url: 'https://example.com' }],
    }
    await redis.set('brand:cached.com', JSON.stringify(cached))

    const result = await scoreBrandAuthority({ domain: 'cached.com', redis })
    if (!Result.isSuccess(result)) {
      throw new Error('expected success')
    }
    expect(result.value.score).toBe(99)
  })
})
