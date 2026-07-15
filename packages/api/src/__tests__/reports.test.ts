import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { audits, db, reports } from '@geolyt/db'
import { createApp } from '../index.js'

describe('reports route', () => {
  const app = createApp()
  let auditId: string

  beforeAll(async () => {
    const inserted = await db
      .insert(audits)
      .values({
        url: 'https://example.com',
        status: 'completed',
        reportFormat: 'pdf',
      })
      .returning()

    auditId = inserted[0]?.id ?? ''
  })

  afterAll(async () => {
    await db.delete(reports)
    await db.delete(audits)
  })

  it('redirects to the public URL when the report exists', async () => {
    await db.insert(reports).values({
      auditId,
      format: 'pdf',
      storageKey: `reports/${auditId}/geo-report.pdf`,
      publicUrl: `https://cdn.example.com/reports/${auditId}/geo-report.pdf`,
    })

    const response = await app.fetch(
      new Request(`http://localhost/reports/${auditId}`, { redirect: 'manual' }),
    )
    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe(
      `https://cdn.example.com/reports/${auditId}/geo-report.pdf`,
    )
  })

  it('returns 404 when the report does not exist', async () => {
    const response = await app.fetch(
      new Request('http://localhost/reports/00000000-0000-0000-0000-000000000000'),
    )
    expect(response.status).toBe(404)
  })
})
