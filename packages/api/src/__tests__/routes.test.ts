import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { apiKeys, auditResults, audits, clients, db, reports, usage } from '@geolyt/db'
import { and, eq } from 'drizzle-orm'
import { currentPeriod, getCurrentUsage } from '../billing/quota.js'
import { createApp } from '../index.js'

const API_KEY = 'test-api-key-geolyt'
const QUOTA_API_KEY = 'test-api-key-geolyt-quota'
const QUOTA_EMAIL = 'quota-route@example.com'

async function setupApiKey(): Promise<string> {
  const inserted = await db
    .insert(clients)
    .values({ name: 'Test client', email: 'test@example.com', monthlyQuota: 5 })
    .returning()
  const clientId = inserted[0]?.id ?? ''
  const hash = await Bun.password.hash(API_KEY)
  await db.insert(apiKeys).values({ name: 'Test key', keyHash: hash, clientId })
  return clientId
}

async function cleanupTables(): Promise<void> {
  await db.delete(auditResults)
  await db.delete(reports)
  await db.delete(audits)
  await db.delete(usage)
  await db.delete(apiKeys)
  await db.delete(clients)
}

describe('API routes', () => {
  const app = createApp()
  let clientId: string

  beforeAll(async () => {
    clientId = await setupApiKey()
  })

  afterAll(async () => {
    await cleanupTables()
  })

  it('GET /health returns ok with db and redis readiness', async () => {
    const response = await app.fetch(new Request('http://localhost/health'))
    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      status: string
      checks: { database: string; redis: string }
    }
    expect(body.status).toBe('ok')
    expect(body.checks.database).toBe('ok')
    expect(body.checks.redis).toBe('ok')
  })

  it('POST /audits rejects requests without an API key', async () => {
    const response = await app.fetch(
      new Request('http://localhost/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com' }),
      }),
    )
    expect(response.status).toBe(401)
  })

  it('POST /audits creates an audit with a valid API key', async () => {
    const response = await app.fetch(
      new Request('http://localhost/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
        body: JSON.stringify({ url: 'https://example.com', reportFormat: 'pdf' }),
      }),
    )
    expect(response.status).toBe(202)
    const body = (await response.json()) as { audit_id: string; status: string }
    expect(body.audit_id).toBeDefined()
    expect(body.status).toBe('pending')

    const getResponse = await app.fetch(
      new Request(`http://localhost/audits/${body.audit_id}`, {
        headers: { 'x-api-key': API_KEY },
      }),
    )
    expect(getResponse.status).toBe(200)
    const getBody = (await getResponse.json()) as { audit_id: string; status: string }
    expect(getBody.audit_id).toBe(body.audit_id)
    expect(['pending', 'collecting']).toContain(getBody.status)
  })

  it('POST /audits enforces the monthly quota via real usage tracking (no manual usage insert)', async () => {
    const inserted = await db
      .insert(clients)
      .values({ name: 'Quota client', email: QUOTA_EMAIL, monthlyQuota: 2 })
      .returning()
    const quotaClientId = inserted[0]?.id ?? ''
    const hash = await Bun.password.hash(QUOTA_API_KEY)
    await db.insert(apiKeys).values({ name: 'Quota key', keyHash: hash, clientId: quotaClientId })

    const postAudit = () =>
      app.fetch(
        new Request('http://localhost/audits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': QUOTA_API_KEY },
          body: JSON.stringify({ url: 'https://example.com', reportFormat: 'pdf' }),
        }),
      )

    const first = await postAudit()
    expect(first.status).toBe(202)
    const second = await postAudit()
    expect(second.status).toBe(202)

    expect(await getCurrentUsage(quotaClientId, currentPeriod())).toBe(2)

    const third = await postAudit()
    expect(third.status).toBe(429)

    const usageRows = await db
      .select()
      .from(usage)
      .where(and(eq(usage.clientId, quotaClientId), eq(usage.period, currentPeriod())))
    expect(usageRows).toHaveLength(2)
    expect(usageRows.every((row) => row.audits === 1)).toBe(true)
  })

  it('GET /clients/me returns the authenticated client', async () => {
    const response = await app.fetch(
      new Request('http://localhost/clients/me', {
        headers: { 'x-api-key': API_KEY },
      }),
    )
    expect(response.status).toBe(200)
    const body = (await response.json()) as { id: string; email: string }
    expect(body.id).toBe(clientId)
    expect(body.email).toBe('test@example.com')
  })

  it('PATCH /clients/me/white-label updates branding config', async () => {
    const response = await app.fetch(
      new Request('http://localhost/clients/me/white-label', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
        body: JSON.stringify({
          companyName: 'Agency Inc',
          logoUrl: 'https://agency.example/logo.png',
          primaryColor: '#ef4444',
        }),
      }),
    )
    expect(response.status).toBe(200)
    const body = (await response.json()) as { white_label_config: { companyName: string } }
    expect(body.white_label_config.companyName).toBe('Agency Inc')

    const getResponse = await app.fetch(
      new Request('http://localhost/clients/me', {
        headers: { 'x-api-key': API_KEY },
      }),
    )
    const getBody = (await getResponse.json()) as { white_label_config: { primaryColor: string } }
    expect(getBody.white_label_config.primaryColor).toBe('#ef4444')
  })

  it('PATCH /clients/me/white-label rejects an invalid hex color', async () => {
    const response = await app.fetch(
      new Request('http://localhost/clients/me/white-label', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
        body: JSON.stringify({ primaryColor: 'red' }),
      }),
    )
    expect(response.status).toBe(400)
  })
})
