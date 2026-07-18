import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { apiKeys, auditDeltas, auditResults, audits, clients, db, sites } from '@geolyt/db'
import type { AuditResult } from '@geolyt/shared'
import { eq } from 'drizzle-orm'
import { createApp } from '../index.js'

const API_KEY = 'test-api-key-sites'

function makeResult(auditId: string, composite: number): AuditResult {
  return {
    auditId,
    url: 'https://example.com',
    status: 'completed',
    scores: {
      aiCitability: 50,
      brandAuthority: 50,
      contentQuality: 50,
      technicalFoundation: 50,
      structuredData: 50,
      platformOptimization: 50,
      composite,
    },
    findings: [],
    crawlerAccess: [],
    generatedAt: new Date(),
    aiSynthesisUsed: false,
  }
}

describe('sites route', () => {
  const app = createApp()
  let clientId: string
  let siteId: string
  let auditAId: string
  let auditBId: string
  let deltaId: string

  beforeAll(async () => {
    const insertedClient = await db
      .insert(clients)
      .values({ name: 'Delta client', email: 'delta@example.com' })
      .returning()
    clientId = insertedClient[0]?.id ?? ''

    const hash = await Bun.password.hash(API_KEY)
    await db.insert(apiKeys).values({ name: 'Test key', keyHash: hash, clientId })

    const insertedSite = await db
      .insert(sites)
      .values({ clientId, url: 'https://example.com' })
      .returning()
    siteId = insertedSite[0]?.id ?? ''

    const insertedA = await db
      .insert(audits)
      .values({
        clientId,
        siteId,
        url: 'https://example.com',
        status: 'completed',
        completedAt: new Date('2026-06-01T00:00:00Z'),
      })
      .returning()
    auditAId = insertedA[0]?.id ?? ''

    const insertedB = await db
      .insert(audits)
      .values({
        clientId,
        siteId,
        url: 'https://example.com',
        status: 'completed',
        completedAt: new Date('2026-07-01T00:00:00Z'),
      })
      .returning()
    auditBId = insertedB[0]?.id ?? ''

    await db.insert(auditResults).values({ auditId: auditAId, data: makeResult(auditAId, 50) })
    await db.insert(auditResults).values({ auditId: auditBId, data: makeResult(auditBId, 65) })
  })

  afterAll(async () => {
    await db.delete(auditDeltas)
    await db.delete(auditResults)
    await db.delete(audits)
    await db.delete(sites)
    await db.delete(apiKeys)
    await db.delete(clients)
  })

  it('POST /sites/:id/deltas creates a delta between the two latest audits', async () => {
    const response = await app.fetch(
      new Request(`http://localhost/sites/${siteId}/deltas`, {
        method: 'POST',
        headers: { 'x-api-key': API_KEY },
      }),
    )
    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      id: string
      score_change: { composite: number }
      audit_a_id: string
      audit_b_id: string
    }
    expect(body.audit_a_id).toBe(auditAId)
    expect(body.audit_b_id).toBe(auditBId)
    expect(body.score_change.composite).toBe(15)
    deltaId = body.id
  })

  it('GET /sites/:id/deltas returns the list of deltas', async () => {
    const response = await app.fetch(
      new Request(`http://localhost/sites/${siteId}/deltas`, {
        headers: { 'x-api-key': API_KEY },
      }),
    )
    expect(response.status).toBe(200)
    const body = (await response.json()) as Array<{ score_change: { composite: number } }>
    expect(body).toHaveLength(1)
    expect(body[0]?.score_change.composite).toBe(15)
  })

  it('GET /sites/:id/deltas/:deltaId/report renders the delta report html', async () => {
    const response = await app.fetch(
      new Request(`http://localhost/sites/${siteId}/deltas/${deltaId}/report`, {
        headers: { 'x-api-key': API_KEY },
      }),
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/html')
    const html = await response.text()
    expect(html).toContain('Score improved from 50 to 65 (+15 pts)')
  })

  it('GET /sites/:id/deltas/:deltaId/report returns 404 for an unknown delta', async () => {
    const response = await app.fetch(
      new Request(
        `http://localhost/sites/${siteId}/deltas/00000000-0000-0000-0000-000000000000/report`,
        {
          headers: { 'x-api-key': API_KEY },
        },
      ),
    )
    expect(response.status).toBe(404)
  })

  it('POST /sites/:id/deltas returns 422 with fewer than two completed audits', async () => {
    const insertedSite = await db
      .insert(sites)
      .values({ clientId, url: 'https://single.example.com' })
      .returning()
    const singleSiteId = insertedSite[0]?.id ?? ''

    const response = await app.fetch(
      new Request(`http://localhost/sites/${singleSiteId}/deltas`, {
        method: 'POST',
        headers: { 'x-api-key': API_KEY },
      }),
    )
    expect(response.status).toBe(422)

    await db.delete(sites).where(eq(sites.id, singleSiteId))
  })
})
