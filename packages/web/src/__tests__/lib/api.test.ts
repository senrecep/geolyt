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

function mockFetch(response: unknown, status = 200) {
  return async (_url: string, _init: RequestInit) =>
    new Response(JSON.stringify(response), { status })
}

describe('fetchAudits', () => {
  it('returns a list of audits on success', async () => {
    global.fetch = mockFetch([mockAudit]) as unknown as typeof fetch
    const audits = await fetchAudits('test-key')
    expect(audits).toHaveLength(1)
    expect(audits[0]?.url).toBe('https://example.com')
  })

  it('throws when the API returns an error', async () => {
    global.fetch = mockFetch({ error: 'unauthorized' }, 401) as unknown as typeof fetch
    await expect(fetchAudits('bad-key')).rejects.toThrow('unauthorized')
  })
})

describe('fetchAudit', () => {
  it('returns a single audit on success', async () => {
    global.fetch = mockFetch(mockAudit) as unknown as typeof fetch
    const audit = await fetchAudit('a1b2c3d4', 'test-key')
    expect(audit.audit_id).toBe('a1b2c3d4')
  })

  it('throws when the audit is not found', async () => {
    global.fetch = mockFetch({ error: 'not found' }, 404) as unknown as typeof fetch
    await expect(fetchAudit('missing', 'test-key')).rejects.toThrow('not found')
  })
})
