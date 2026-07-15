import { collectPage } from '@geolyt/core'
import { audits, db } from '@geolyt/db'
import type { PageData } from '@geolyt/shared'
import { withSpan } from '@geolyt/shared'
import { Worker } from 'bullmq'
import { eq } from 'drizzle-orm'
import { aiRedisConnection, redisConnection } from '../connection.js'
import type { AuditFlowInput } from '../flow.js'
import { QUEUE_NAMES } from '../queues.js'
import { checkCollectRateLimit } from '../rate-limit.js'

export const collectWorker = new Worker<AuditFlowInput, PageData>(
  QUEUE_NAMES.collect,
  async (job) => {
    const { auditId, url } = job.data

    return withSpan('jobs.collect', { audit_id: auditId, url, stage: 'collect' }, async () => {
      const hostname = new URL(url).hostname
      const allowed = await checkCollectRateLimit(aiRedisConnection, hostname)
      if (!allowed) {
        throw new Error(`Rate limit exceeded for ${hostname}`)
      }

      await db.update(audits).set({ status: 'collecting' }).where(eq(audits.id, auditId))

      const result = await collectPage(url).toResult()
      if (!result.ok) {
        await db
          .update(audits)
          .set({ status: 'failed', completedAt: new Date() })
          .where(eq(audits.id, auditId))
        throw new Error(result.errors.map((e) => `${e.code}: ${e.description}`).join(', '))
      }

      return result.value
    })
  },
  { connection: redisConnection, concurrency: 5 },
)
