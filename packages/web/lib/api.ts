import type { AuditResult, WhiteLabelConfig } from '@geolyt/shared'

const API_BASE_URL = process.env.GEOLYT_API_URL ?? 'http://localhost:3000'

interface ClientInfo {
  id: string
  name: string
  email: string
  plan: string
  monthly_quota: number
  white_label_config: WhiteLabelConfig | null
}

interface AuditListItem {
  audit_id: string
  url: string
  status: string
  created_at: string
  completed_at: string | null
  result: AuditResult | null
}

interface ReportInfo {
  audit_id: string
  format: string
  storage_key: string
  public_url: string
}

function buildHeaders(cookie?: string): HeadersInit {
  const headers: HeadersInit = {}
  if (cookie) {
    headers.cookie = cookie
  }
  return headers
}

export async function fetchAudits(cookie?: string): Promise<AuditListItem[]> {
  const response = await fetch(`${API_BASE_URL}/audits`, {
    headers: buildHeaders(cookie),
    next: { revalidate: 10 },
  })

  const data = (await response.json()) as AuditListItem[] | { error: string }
  if (!response.ok || 'error' in data) {
    throw new Error('error' in data ? data.error : `Failed to fetch audits: ${response.status}`)
  }

  return data
}

export async function fetchAudit(auditId: string, cookie?: string): Promise<AuditListItem> {
  const response = await fetch(`${API_BASE_URL}/audits/${auditId}`, {
    headers: buildHeaders(cookie),
    next: { revalidate: 5 },
  })

  const data = (await response.json()) as AuditListItem | { error: string }
  if (!response.ok || 'error' in data) {
    throw new Error('error' in data ? data.error : `Failed to fetch audit: ${response.status}`)
  }

  return data
}

export async function fetchClient(cookie?: string): Promise<ClientInfo> {
  const response = await fetch(`${API_BASE_URL}/clients/me`, {
    headers: buildHeaders(cookie),
    next: { revalidate: 60 },
  })

  const data = (await response.json()) as ClientInfo | { error: string }
  if (!response.ok || 'error' in data) {
    throw new Error('error' in data ? data.error : `Failed to fetch client: ${response.status}`)
  }

  return data
}

export async function fetchClientByDomain(domain: string): Promise<ClientInfo | null> {
  const response = await fetch(
    `${API_BASE_URL}/clients/lookup?domain=${encodeURIComponent(domain)}`,
    {
      next: { revalidate: 300 },
    },
  )

  if (response.status === 404) {
    return null
  }

  const data = (await response.json()) as ClientInfo | { error: string }
  if (!response.ok || 'error' in data) {
    throw new Error('error' in data ? data.error : `Failed to lookup client: ${response.status}`)
  }

  return data
}

export async function fetchReport(auditId: string, cookie?: string): Promise<ReportInfo> {
  const response = await fetch(`${API_BASE_URL}/audits/${auditId}/report`, {
    headers: buildHeaders(cookie),
    next: { revalidate: 5 },
  })

  const data = (await response.json()) as ReportInfo | { error: string }
  if (!response.ok || 'error' in data) {
    throw new Error('error' in data ? data.error : `Failed to fetch report: ${response.status}`)
  }

  return data
}
