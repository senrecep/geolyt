import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { apiKeys, clients, db, usage } from '@geolyt/db'
import { eq } from 'drizzle-orm'
import { createApp } from '../index.js'

const API_KEY = 'test-api-key-usage'
const EMAIL = `usage-${Date.now()}@example.com`

describe('usage route', () => {
  const app = createApp()
  let clientId: string

  beforeAll(async () => {
    await db.delete(clients).where(eq(clients.email, EMAIL))

    const inserted = await db
      .insert(clients)
      .values({ name: 'Usage client', email: EMAIL })
      .returning()
    clientId = inserted[0]?.id ?? ''

    const hash = await Bun.password.hash(API_KEY)
    await db.insert(apiKeys).values({ name: 'Test key', keyHash: hash, clientId })

    await db.insert(usage).values({
      clientId,
      period: '2026-07',
      aiTokensCached: 1_000_000,
      aiTokensUncached: 1_000_000,
      aiTokensOutput: 500_000,
    })
  })

  afterAll(async () => {
    await db.delete(usage).where(eq(usage.clientId, clientId))
    await db.delete(apiKeys).where(eq(apiKeys.clientId, clientId))
    await db.delete(clients).where(eq(clients.id, clientId))
  })

  it('GET /usage returns aggregated AI token usage and cost', async () => {
    const response = await app.fetch(
      new Request('http://localhost/usage', {
        headers: { 'x-api-key': API_KEY },
      }),
    )
    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      estimated_cost_usd: number
      cache_hit_rate: number
      ai_tokens: { cached: number; uncached: number; output: number }
    }
    expect(body.ai_tokens.cached).toBe(1_000_000)
    expect(body.ai_tokens.uncached).toBe(1_000_000)
    expect(body.ai_tokens.output).toBe(500_000)
    expect(body.cache_hit_rate).toBe(0.5)
    expect(body.estimated_cost_usd).toBeGreaterThan(0)
  })
})
