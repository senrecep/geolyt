import type { AuditResult } from '@geolyt/shared'

const API_BASE_URL = process.env.GEOLYT_API_URL ?? 'http://localhost:3000'

interface AuditListItem {
  audit_id: string
  url: string
  status: string
  created_at: string
  completed_at: string | null
  result: AuditResult | null
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
