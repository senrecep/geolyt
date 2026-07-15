import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { clients, db, usage } from '@geolyt/db'
import { checkQuota, currentPeriod, getCurrentUsage } from '../../billing/quota.js'

describe('quota helpers', () => {
  let clientId: string

  beforeAll(async () => {
    const inserted = await db
      .insert(clients)
      .values({ name: 'Quota test', email: 'quota@test.com' })
      .returning()
    clientId = inserted[0]?.id ?? ''
  })

  afterEach(async () => {
    await db.delete(usage)
  })

  afterAll(async () => {
    await db.delete(usage)
    await db.delete(clients)
  })

  it('returns zero usage when no records exist', async () => {
    const used = await getCurrentUsage(clientId)
    expect(used).toBe(0)
  })

  it('sums audits for the current period', async () => {
    await db.insert(usage).values({
      clientId,
      period: currentPeriod(),
      audits: 3,
    })

    const used = await getCurrentUsage(clientId)
    expect(used).toBe(3)
  })

  it('allows requests when quota is not exceeded', async () => {
    await db.insert(usage).values({
      clientId,
      period: currentPeriod(),
      audits: 2,
    })

    const allowed = await checkQuota(clientId, 5)
    expect(allowed).toBe(true)
  })

  it('blocks requests when quota is exceeded', async () => {
    await db.insert(usage).values({
      clientId,
      period: currentPeriod(),
      audits: 5,
    })

    const allowed = await checkQuota(clientId, 5)
    expect(allowed).toBe(false)
  })

  it('treats a quota of zero as unlimited', async () => {
    const allowed = await checkQuota(clientId, 0)
    expect(allowed).toBe(true)
  })
})
