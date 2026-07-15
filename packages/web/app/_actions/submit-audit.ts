'use server'

import { cookies } from 'next/headers'

const API_BASE_URL = process.env.GEOLYT_API_URL ?? 'http://localhost:3000'

export async function submitAudit(
  formData: FormData,
): Promise<{ success: boolean; auditId?: string; error?: string }> {
  const url = formData.get('url') as string
  const reportFormat = (formData.get('reportFormat') as string) ?? 'pdf'

  if (!url || !URL.canParse(url)) {
    return { success: false, error: 'A valid URL is required' }
  }

  const cookieStore = await cookies()
  const cookieHeader = cookieStore.toString()

  const response = await fetch(`${API_BASE_URL}/audits`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    body: JSON.stringify({ url, reportFormat }),
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    return { success: false, error: body.error ?? `Request failed with status ${response.status}` }
  }

  const data = (await response.json()) as { audit_id: string }
  return { success: true, auditId: data.audit_id }
}
