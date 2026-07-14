import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { collectPage } from '../../collectors/collect-page.js'

type FetchInput = string | URL | Request

describe('collectPage (plain fetch)', () => {
  let originalFetch: typeof fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('returns PageData for a valid public page', async () => {
    globalThis.fetch = mock((input: FetchInput) => {
      const url = input.toString()
      if (url === 'https://example.com/robots.txt') {
        return Promise.resolve(new Response('User-agent: *\nDisallow: /admin', { status: 200 }))
      }
      if (url === 'https://example.com/llms.txt') {
        return Promise.resolve(new Response('Not found', { status: 404 }))
      }
      return Promise.resolve(
        new Response(
          `<html><head><title>Example</title><meta name="description" content="A page"></head>
           <body><h1>Hello</h1><p>This is a paragraph with enough words to pass.</p></body></html>`,
          { status: 200, url: 'https://example.com/' } as ResponseInit,
        ),
      )
    }) as unknown as typeof fetch

    const result = await collectPage('https://example.com').toResult()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.title).toBe('Example')
      expect(result.value.metaDescription).toBe('A page')
      expect(result.value.contentBlocks.length).toBeGreaterThan(0)
      expect(result.value.robots).toContain('Disallow')
      expect(result.value.llmsTxt).toBeNull()
    }
  })

  it('blocks private URLs', async () => {
    const result = await collectPage('http://192.168.1.1').toResult()
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe('GEO.CrawlerBlocked')
    }
  })

  it('handles missing content as JavaScript-rendered', async () => {
    globalThis.fetch = mock((input: FetchInput) => {
      const url = input.toString()
      if (url.includes('robots.txt') || url.includes('llms.txt')) {
        return Promise.resolve(new Response('Not found', { status: 404 }))
      }
      return Promise.resolve(
        new Response(
          '<html><head><title>Empty</title></head><body><div id="root"></div></body></html>',
          {
            status: 200,
          },
        ),
      )
    }) as unknown as typeof fetch

    const result = await collectPage('https://example.com').toResult()
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe('GEO.JsRenderedOnly')
    }
  })
})

describe('collectPage (Firecrawl)', () => {
  let originalFetch: typeof fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('returns PageData from a Firecrawl response', async () => {
    globalThis.fetch = mock((input: FetchInput) => {
      const url = input.toString()
      if (url.endsWith('/v1/scrape')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: {
                html: '<html><body><h1>Firecrawl</h1><p>Content from Firecrawl.</p></body></html>',
                metadata: { title: 'Firecrawl', sourceURL: 'https://example.com/' },
              },
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
        )
      }
      return Promise.resolve(new Response('Not found', { status: 404 }))
    }) as unknown as typeof fetch

    const result = await collectPage('https://example.com', {
      firecrawlUrl: 'http://localhost:3002',
    }).toResult()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.title).toBe('Firecrawl')
      expect(result.value.contentBlocks.length).toBeGreaterThan(0)
    }
  })

  it('returns CrawlerBlocked on a 403 Firecrawl response', async () => {
    globalThis.fetch = mock((input: FetchInput) => {
      const url = input.toString()
      if (url.endsWith('/v1/scrape')) {
        return Promise.resolve(new Response(JSON.stringify({ success: false }), { status: 403 }))
      }
      return Promise.resolve(new Response('Not found', { status: 404 }))
    }) as unknown as typeof fetch

    const result = await collectPage('https://example.com', {
      firecrawlUrl: 'http://localhost:3002',
    }).toResult()
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe('GEO.CrawlerBlocked')
    }
  })
})
