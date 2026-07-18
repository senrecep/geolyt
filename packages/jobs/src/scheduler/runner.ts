import { logger } from '@geolyt/shared'
import { scheduleMonthlyReAudits } from './monthly-audit.js'

export function startMonthlyReAuditScheduler(): void {
  if (typeof Bun !== 'undefined' && typeof Bun.cron === 'function') {
    Bun.cron('0 9 1 * *', async () => {
      await scheduleMonthlyReAudits()
    })
    return
  }

  logger.warn('Bun.cron is not available; monthly re-audits must be triggered manually.')
}
