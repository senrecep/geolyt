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

    await db.insert(usage).values([
      {
        clientId,
        period: '2026-07',
        model: 'gemini-3.5-flash',
        aiTokensCached: 1_000_000,
        aiTokensUncached: 1_000_000,
        aiTokensOutput: 500_000,
      },
      {
        clientId,
        period: '2026-07',
        model: 'claude-haiku-4-5',
        aiTokensCached: 0,
        aiTokensUncached: 200_000,
        aiTokensOutput: 100_000,
      },
    ])
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
      by_model: Array<{
        model: string
        cached: number
        uncached: number
        output: number
        estimated_cost_usd: number
      }>
    }
    expect(body.ai_tokens.cached).toBe(1_000_000)
    expect(body.ai_tokens.uncached).toBe(1_200_000)
    expect(body.ai_tokens.output).toBe(600_000)
    expect(body.estimated_cost_usd).toBeGreaterThan(0)

    expect(body.by_model).toHaveLength(2)
    const flash = body.by_model.find((m) => m.model === 'gemini-3.5-flash')
    const haiku = body.by_model.find((m) => m.model === 'claude-haiku-4-5')
    expect(flash).toBeDefined()
    expect(flash?.cached).toBe(1_000_000)
    expect(flash?.uncached).toBe(1_000_000)
    expect(flash?.output).toBe(500_000)
    expect(flash?.estimated_cost_usd).toBeGreaterThan(0)
    expect(haiku).toBeDefined()
    expect(haiku?.cached).toBe(0)
    expect(haiku?.uncached).toBe(200_000)
    expect(haiku?.output).toBe(100_000)
    expect(haiku?.estimated_cost_usd).toBeGreaterThan(0)
  })
})
