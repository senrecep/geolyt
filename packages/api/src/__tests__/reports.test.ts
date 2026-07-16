import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { auditResults, audits, db, reports } from '@geolyt/db'
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

    await db.insert(auditResults).values({
      auditId,
      data: {
        auditId,
        url: 'https://example.com',
        status: 'completed',
        scores: {
          composite: 67,
          aiCitability: 70,
          brandAuthority: 60,
          contentQuality: 65,
          technicalFoundation: 75,
          structuredData: 80,
          platformOptimization: 55,
        },
        findings: [],
        crawlerAccess: [],
        generatedAt: new Date(),
        aiSynthesisUsed: false,
      },
    })
  })

  afterEach(async () => {
    await db.delete(reports)
  })

  afterAll(async () => {
    await db.delete(reports)
    await db.delete(auditResults)
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

  it('returns an HTML landing page with OG meta tags by share token', async () => {
    const shareToken = '11111111-1111-1111-1111-111111111111'
    await db.insert(reports).values({
      auditId,
      format: 'pdf',
      storageKey: `reports/${auditId}/geo-report.pdf`,
      publicUrl: `https://cdn.example.com/reports/${auditId}/geo-report.pdf`,
      shareToken,
    })

    const response = await app.fetch(
      new Request(`http://localhost/reports/share/${shareToken}`, { redirect: 'manual' }),
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('text/html')

    const html = await response.text()
    expect(html).toContain('<meta property="og:title"')
    expect(html).toContain('67/100')
    expect(html).toContain('https://example.com')
    expect(html).toContain(`https://cdn.example.com/reports/${auditId}/geo-report.pdf`)
  })
})
