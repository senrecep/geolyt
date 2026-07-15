import { describe, expect, it, mock } from 'bun:test'
import { submitAudit } from '../../../app/_actions/submit-audit'

const mockCookie = 'better-auth.session_token=test-token'

mock.module('next/headers', () => ({
  cookies: async () => ({
    toString: () => mockCookie,
  }),
}))

function mockFetch(response: unknown, status = 200) {
  return async (_url: string, _init: RequestInit) =>
    new Response(JSON.stringify(response), { status })
}

describe('submitAudit', () => {
  it('returns an error for an invalid URL', async () => {
    const formData = new FormData()
    formData.set('url', 'not-a-url')

    const result = await submitAudit(formData)
    expect(result.success).toBe(false)
    expect(result.error).toContain('valid URL')
  })

  it('sends the auth cookie to the API', async () => {
    global.fetch = (async (_url: string, init: RequestInit) => {
      const headers = init.headers as Record<string, string>
      expect(headers.cookie).toBe(mockCookie)
      return new Response(JSON.stringify({ audit_id: 'a1b2c3d4' }), { status: 202 })
    }) as unknown as typeof fetch

    const formData = new FormData()
    formData.set('url', 'https://example.com')

    const result = await submitAudit(formData)
    expect(result.success).toBe(true)
    expect(result.auditId).toBe('a1b2c3d4')
  })

  it('returns the API error when the request fails', async () => {
    global.fetch = mockFetch({ error: 'unauthorized' }, 401) as unknown as typeof fetch

    const formData = new FormData()
    formData.set('url', 'https://example.com')

    const result = await submitAudit(formData)
    expect(result.success).toBe(false)
    expect(result.error).toContain('unauthorized')
  })
})
