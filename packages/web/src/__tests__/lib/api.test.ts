import { describe, expect, it } from 'bun:test'
import { fetchAudit, fetchAudits } from '../../../lib/api'

const mockAudit = {
  audit_id: 'a1b2c3d4',
  url: 'https://example.com',
  status: 'completed',
  created_at: '2026-07-14T12:00:00Z',
  completed_at: '2026-07-14T12:05:00Z',
  result: null,
}

const mockCookie = 'better-auth.session_token=test-token'

function mockFetch(response: unknown, status = 200) {
  return async (_url: string, _init: RequestInit) => {
    return new Response(JSON.stringify(response), { status })
  }
}

describe('fetchAudits', () => {
  it('returns a list of audits on success', async () => {
    global.fetch = mockFetch([mockAudit]) as unknown as typeof fetch
    const audits = await fetchAudits(mockCookie)
    expect(audits).toHaveLength(1)
    expect(audits[0]?.url).toBe('https://example.com')
  })

  it('sends the cookie header to the API', async () => {
    global.fetch = (async (_url: string, init: RequestInit) => {
      expect(init.headers).toEqual(expect.objectContaining({ cookie: mockCookie }))
      return new Response(JSON.stringify([mockAudit]), { status: 200 })
    }) as unknown as typeof fetch

    await fetchAudits(mockCookie)
  })

  it('throws when the API returns an error', async () => {
    global.fetch = mockFetch({ error: 'unauthorized' }, 401) as unknown as typeof fetch
    await expect(fetchAudits(mockCookie)).rejects.toThrow('unauthorized')
  })
})

describe('fetchAudit', () => {
  it('returns a single audit on success', async () => {
    global.fetch = mockFetch(mockAudit) as unknown as typeof fetch
    const audit = await fetchAudit('a1b2c3d4', mockCookie)
    expect(audit.audit_id).toBe('a1b2c3d4')
  })

  it('throws when the audit is not found', async () => {
    global.fetch = mockFetch({ error: 'not found' }, 404) as unknown as typeof fetch
    await expect(fetchAudit('missing', mockCookie)).rejects.toThrow('not found')
  })
})
