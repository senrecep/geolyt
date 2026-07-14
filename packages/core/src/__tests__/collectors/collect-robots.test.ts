import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { collectRobots } from '../../collectors/collect-robots.js'

describe('collectRobots', () => {
  let originalFetch: typeof fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('returns robots.txt content when available', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response('User-agent: *\nDisallow: /admin', {
          status: 200,
        }),
      ),
    ) as unknown as typeof fetch

    const result = await collectRobots('https://example.com').toResult()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toContain('Disallow: /admin')
    }
  })

  it('returns null on 404', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response('Not found', {
          status: 404,
        }),
      ),
    ) as unknown as typeof fetch

    const result = await collectRobots('https://example.com').toResult()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toBeNull()
    }
  })
})
