import { describe, expect, it } from 'bun:test'
import { submitAudit } from '../../../app/_actions/submit-audit'

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

  it('returns an error when the dashboard API key is missing', async () => {
    const formData = new FormData()
    formData.set('url', 'https://example.com')

    const originalKey = process.env.GEOLYT_DASHBOARD_API_KEY
    process.env.GEOLYT_DASHBOARD_API_KEY = ''

    const result = await submitAudit(formData)
    expect(result.success).toBe(false)
    expect(result.error).toContain('API key is not configured')

    process.env.GEOLYT_DASHBOARD_API_KEY = originalKey
  })

  it('returns the audit id on success', async () => {
    global.fetch = mockFetch({ audit_id: 'a1b2c3d4' }) as unknown as typeof fetch

    const originalKey = process.env.GEOLYT_DASHBOARD_API_KEY
    process.env.GEOLYT_DASHBOARD_API_KEY = 'test-key'

    const formData = new FormData()
    formData.set('url', 'https://example.com')

    const result = await submitAudit(formData)
    expect(result.success).toBe(true)
    expect(result.auditId).toBe('a1b2c3d4')

    process.env.GEOLYT_DASHBOARD_API_KEY = originalKey
  })
})
