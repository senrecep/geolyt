import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { fetchHtml } from '../../collectors/fetch-html.js'

type FetchInput = string | URL | Request

describe('fetchHtml', () => {
  let originalFetch: typeof fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('returns html and finalUrl on a 200 response', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response('<html><body>Hello</body></html>', {
          status: 200,
          headers: new Headers({ 'content-type': 'text/html' }),
          url: 'https://example.com/',
        } as ResponseInit),
      ),
    ) as unknown as typeof fetch

    const result = await fetchHtml('https://example.com').toResult()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.html).toContain('Hello')
      expect(result.value.statusCode).toBe(200)
      expect(result.value.finalUrl).toBe('https://example.com')
      expect(result.value.headers['content-type']).toBe('text/html')
    }
  })

  it('follows a single redirect', async () => {
    globalThis.fetch = mock((input: FetchInput) => {
      const url = input.toString()
      if (url === 'https://example.com/old') {
        return Promise.resolve(
          new Response('', {
            status: 301,
            headers: new Headers({ location: 'https://example.com/new' }),
          }),
        )
      }
      return Promise.resolve(
        new Response('<html>Final</html>', {
          status: 200,
          url: 'https://example.com/new',
        } as ResponseInit),
      )
    }) as unknown as typeof fetch

    const result = await fetchHtml('https://example.com/old').toResult()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.finalUrl).toBe('https://example.com/new')
    }
  })

  it('returns a timeout error when fetch throws', async () => {
    globalThis.fetch = mock(() =>
      Promise.reject(new Error('network down')),
    ) as unknown as typeof fetch

    const result = await fetchHtml('https://example.com').toResult()
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe('GEO.FetchTimeout')
    }
  })

  it('blocks cross-domain redirects', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response('', {
          status: 302,
          headers: new Headers({ location: 'https://evil.com/' }),
        }),
      ),
    ) as unknown as typeof fetch

    const result = await fetchHtml('https://example.com/redirect').toResult()
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe('GEO.RedirectBlocked')
    }
  })

  it('blocks redirects to private IP ranges', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response('', {
          status: 302,
          headers: new Headers({ location: 'http://192.168.1.1/' }),
        }),
      ),
    ) as unknown as typeof fetch

    const result = await fetchHtml('https://example.com/redirect').toResult()
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe('GEO.RedirectBlocked')
    }
  })
})
