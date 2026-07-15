import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { audits, clients, db, sites } from '@geolyt/db'
import { eq } from 'drizzle-orm'
import { scheduleMonthlyReAudits } from '../../scheduler/monthly-audit.js'

describe('scheduleMonthlyReAudits', () => {
  let clientId: string
  let oldSiteId: string
  let recentSiteId: string

  beforeAll(async () => {
    const insertedClient = await db
      .insert(clients)
      .values({ name: 'Scheduler client', email: 'scheduler@example.com' })
      .returning()
    clientId = insertedClient[0]?.id ?? ''

    const oldSite = await db
      .insert(sites)
      .values({ clientId, url: 'https://old.example.com' })
      .returning()
    oldSiteId = oldSite[0]?.id ?? ''

    await db.insert(audits).values({
      clientId,
      siteId: oldSiteId,
      url: 'https://old.example.com',
      status: 'completed',
      completedAt: new Date('2026-05-01T00:00:00Z'),
      createdAt: new Date('2026-05-01T00:00:00Z'),
    })

    const recentSite = await db
      .insert(sites)
      .values({ clientId, url: 'https://recent.example.com' })
      .returning()
    recentSiteId = recentSite[0]?.id ?? ''

    await db.insert(audits).values({
      clientId,
      siteId: recentSiteId,
      url: 'https://recent.example.com',
      status: 'completed',
      completedAt: new Date('2026-07-14T00:00:00Z'),
      createdAt: new Date('2026-07-14T00:00:00Z'),
    })
  })

  afterAll(async () => {
    await db.delete(audits).where(eq(audits.clientId, clientId))
    await db.delete(sites).where(eq(sites.clientId, clientId))
    await db.delete(clients).where(eq(clients.id, clientId))
  })

  it('schedules a re-audit only for sites whose last audit is older than 30 days', async () => {
    const now = new Date('2026-07-15T00:00:00Z')
    const scheduled = await scheduleMonthlyReAudits(now)
    expect(scheduled).toBe(1)

    const oldAudits = await db.query.audits.findMany({
      where: eq(audits.siteId, oldSiteId),
    })
    expect(oldAudits.length).toBe(2)

    const recentAudits = await db.query.audits.findMany({
      where: eq(audits.siteId, recentSiteId),
    })
    expect(recentAudits.length).toBe(1)
  })
})
