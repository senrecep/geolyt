import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { collectLlmsTxt } from '../../collectors/collect-llmstxt.js'

describe('collectLlmsTxt', () => {
  let originalFetch: typeof fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('returns llms.txt content when available', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response('# llms.txt\nDocs: https://example.com/docs', {
          status: 200,
        }),
      ),
    ) as unknown as typeof fetch

    const result = await collectLlmsTxt('https://example.com').toResult()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toContain('llms.txt')
    }
  })

  it('returns null when missing', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response('Not found', {
          status: 404,
        }),
      ),
    ) as unknown as typeof fetch

    const result = await collectLlmsTxt('https://example.com').toResult()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toBeNull()
    }
  })
})
