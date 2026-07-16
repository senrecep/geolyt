import { describe, expect, it } from 'bun:test'
import {
  fetchAudit,
  fetchAudits,
  fetchClient,
  fetchClientByDomain,
  fetchReport,
} from '../../../lib/api'

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

const mockReport = {
  audit_id: 'a1b2c3d4',
  format: 'pdf',
  storage_key: 'reports/a1b2c3d4/geo-report.pdf',
  public_url: 'https://cdn.example.com/reports/a1b2c3d4/geo-report.pdf',
}

const mockClient = {
  id: 'client-1',
  name: 'Agency Inc',
  email: 'agency@example.com',
  plan: 'pro',
  monthly_quota: 100,
  white_label_config: { companyName: 'Agency Inc', primaryColor: '#ef4444' },
}

describe('fetchClient', () => {
  it('returns client info with white-label config on success', async () => {
    global.fetch = mockFetch(mockClient) as unknown as typeof fetch
    const client = await fetchClient(mockCookie)
    expect(client.id).toBe('client-1')
    expect(client.white_label_config?.companyName).toBe('Agency Inc')
  })

  it('throws when the API returns an error', async () => {
    global.fetch = mockFetch({ error: 'Unauthorized' }, 401) as unknown as typeof fetch
    await expect(fetchClient(mockCookie)).rejects.toThrow('Unauthorized')
  })
})

describe('fetchClientByDomain', () => {
  it('returns client info for a matching custom domain', async () => {
    global.fetch = mockFetch(mockClient) as unknown as typeof fetch
    const client = await fetchClientByDomain('dashboard.agency.test')
    expect(client?.id).toBe('client-1')
  })

  it('returns null when no client matches the domain', async () => {
    global.fetch = mockFetch({ error: 'not found' }, 404) as unknown as typeof fetch
    const client = await fetchClientByDomain('unknown.test')
    expect(client).toBeNull()
  })
})

describe('fetchReport', () => {
  it('returns report metadata on success', async () => {
    global.fetch = mockFetch(mockReport) as unknown as typeof fetch
    const report = await fetchReport('a1b2c3d4', mockCookie)
    expect(report.format).toBe('pdf')
    expect(report.public_url).toBe(mockReport.public_url)
  })

  it('throws when the report is not ready', async () => {
    global.fetch = mockFetch({ error: 'Report not ready' }, 404) as unknown as typeof fetch
    await expect(fetchReport('missing', mockCookie)).rejects.toThrow('Report not ready')
  })
})
