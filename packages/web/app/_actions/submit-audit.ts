'use server'

const API_BASE_URL = process.env.GEOLYT_API_URL ?? 'http://localhost:3000'

export async function submitAudit(
  formData: FormData,
): Promise<{ success: boolean; auditId?: string; error?: string }> {
  const url = formData.get('url') as string
  const reportFormat = (formData.get('reportFormat') as string) ?? 'pdf'
  const apiKey = process.env.GEOLYT_DASHBOARD_API_KEY ?? ''

  if (!url || !URL.canParse(url)) {
    return { success: false, error: 'A valid URL is required' }
  }

  if (!apiKey) {
    return { success: false, error: 'Dashboard API key is not configured' }
  }

  const response = await fetch(`${API_BASE_URL}/audits`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
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
