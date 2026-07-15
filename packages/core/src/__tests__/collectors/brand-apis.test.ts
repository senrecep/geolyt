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

interface FakeFetchResponse {
  wikipedia?: unknown
  wikidata?: unknown
  youtube?: unknown
  reddit?: unknown
}

function fakeFetch(response: FakeFetchResponse) {
  return async (url: string): Promise<Response> => {
    if (url.includes('wikipedia')) {
      return Response.json({
        query: { search: response.wikipedia ? [response.wikipedia] : [] },
      })
    }
    if (url.includes('wikidata')) {
      return Response.json({
        search: response.wikidata ? [response.wikidata] : [],
      })
    }
    if (url.includes('youtube')) {
      return Response.json({
        items: response.youtube ? [response.youtube] : [],
      })
    }
    if (url.includes('reddit')) {
      return Response.json({
        data: {
          children: response.reddit ? [response.reddit] : [],
        },
      })
    }
    return Response.json({})
  }
}

describe('scoreBrandAuthority', () => {
  beforeEach(() => {
    process.env.WIKIPEDIA_USER_AGENT = 'geolyt-test'
  })

  it('returns a high score when Wikipedia and Wikidata mention the brand', async () => {
    const fetcher = fakeFetch({
      wikipedia: { title: 'Example Inc' },
      wikidata: { id: 'Q123', label: 'Example Inc' },
    })

    const result = await scoreBrandAuthority({ domain: 'example.com', fetcher })
    if (!Result.isSuccess(result)) {
      throw new Error('expected success')
    }
    expect(result.value.score).toBe(85)
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

  it('includes YouTube mentions when an API key is provided', async () => {
    const fetcher = fakeFetch({
      youtube: { id: { videoId: 'abc123' }, snippet: { title: 'Example Inc Review' } },
    })

    const result = await scoreBrandAuthority({
      domain: 'example.com',
      fetcher,
      youtubeApiKey: 'test-key',
    })
    if (!Result.isSuccess(result)) {
      throw new Error('expected success')
    }
    expect(result.value.mentions.some((m) => m.platform === 'youtube')).toBe(true)
    expect(result.value.score).toBe(25)
  })

  it('skips YouTube when no API key is provided', async () => {
    const fetcher = fakeFetch({
      youtube: { id: { videoId: 'abc123' }, snippet: { title: 'Example Inc Review' } },
    })

    const result = await scoreBrandAuthority({ domain: 'example.com', fetcher })
    if (!Result.isSuccess(result)) {
      throw new Error('expected success')
    }
    expect(result.value.mentions.some((m) => m.platform === 'youtube')).toBe(false)
  })

  it('includes Reddit mentions from the public JSON API', async () => {
    const fetcher = fakeFetch({
      reddit: { data: { title: 'Example Inc discussion', permalink: '/r/example/comments/1' } },
    })

    const result = await scoreBrandAuthority({ domain: 'example.com', fetcher })
    if (!Result.isSuccess(result)) {
      throw new Error('expected success')
    }
    expect(result.value.mentions.some((m) => m.platform === 'reddit')).toBe(true)
    expect(result.value.score).toBe(20)
  })

  it('caps the brand authority score at 100', async () => {
    const fetcher = fakeFetch({
      wikipedia: { title: 'Example Inc' },
      wikidata: { id: 'Q123', label: 'Example Inc' },
      youtube: { id: { videoId: 'abc123' }, snippet: { title: 'Example Inc Review' } },
      reddit: { data: { title: 'Example Inc discussion', permalink: '/r/example/comments/1' } },
    })

    const result = await scoreBrandAuthority({
      domain: 'example.com',
      fetcher,
      youtubeApiKey: 'test-key',
    })
    if (!Result.isSuccess(result)) {
      throw new Error('expected success')
    }
    expect(result.value.score).toBe(100)
  })
})
