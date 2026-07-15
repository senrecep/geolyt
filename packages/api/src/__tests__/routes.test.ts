import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { apiKeys, auditResults, audits, clients, db, reports, usage } from '@geolyt/db'
import { currentPeriod } from '../billing/quota.js'
import { createApp } from '../index.js'

const API_KEY = 'test-api-key-geolyt'

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

  it('GET /health returns ok', async () => {
    const response = await app.fetch(new Request('http://localhost/health'))
    expect(response.status).toBe(200)
    const body = (await response.json()) as { status: string }
    expect(body.status).toBe('ok')
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

  it('POST /audits returns 429 when the monthly quota is exceeded', async () => {
    await db.insert(usage).values({
      clientId,
      period: currentPeriod(),
      audits: 5,
    })

    const response = await app.fetch(
      new Request('http://localhost/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
        body: JSON.stringify({ url: 'https://example.com', reportFormat: 'pdf' }),
      }),
    )
    expect(response.status).toBe(429)
  })
})
