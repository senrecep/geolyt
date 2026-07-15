import { db, usage } from '@geolyt/db'
import { and, eq, sql } from 'drizzle-orm'

export function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7)
}

export async function getCurrentUsage(clientId: string, period?: string): Promise<number> {
  const targetPeriod = period ?? currentPeriod()
  const rows = await db
    .select({ audits: sql<string>`coalesce(sum(${usage.audits}), 0)` })
    .from(usage)
    .where(and(eq(usage.clientId, clientId), eq(usage.period, targetPeriod)))

  return Number(rows[0]?.audits ?? 0)
}

export async function checkQuota(clientId: string, monthlyQuota: number): Promise<boolean> {
  if (monthlyQuota <= 0) {
    return true
  }
  const used = await getCurrentUsage(clientId)
  return used < monthlyQuota
}
