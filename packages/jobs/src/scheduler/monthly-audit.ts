import { audits, db } from '@geolyt/db'
import { enqueueAudit } from '../flow.js'

const MS_PER_DAY = 1000 * 60 * 60 * 24
const RE_AUDIT_DAYS = 30

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / MS_PER_DAY)
}

export async function scheduleMonthlyReAudits(now = new Date()): Promise<number> {
  const allSites = await db.query.sites.findMany({
    with: {
      audits: {
        orderBy: (audits, { desc }) => [desc(audits.createdAt)],
        limit: 1,
      },
    },
  })

  let scheduled = 0

  for (const site of allSites) {
    const lastAudit = site.audits[0]
    const daysSince = lastAudit ? daysBetween(lastAudit.createdAt, now) : Number.POSITIVE_INFINITY

    if (daysSince >= RE_AUDIT_DAYS) {
      const inserted = await db
        .insert(audits)
        .values({
          clientId: site.clientId,
          siteId: site.id,
          url: site.url,
          status: 'pending',
        })
        .returning()

      const audit = inserted[0]
      if (audit) {
        await enqueueAudit({
          auditId: audit.id,
          url: site.url,
          reportFormat: 'pdf',
        })
        scheduled++
      }
    }
  }

  return scheduled
}
