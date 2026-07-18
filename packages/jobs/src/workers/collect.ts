import { collectPage } from '@geolyt/core'
import { audits, db } from '@geolyt/db'
import type { CollectResult } from '@geolyt/shared'
import { withSpan } from '@geolyt/shared'
import { Worker } from 'bullmq'
import { eq } from 'drizzle-orm'
import { recordCrawlOutcome } from '../alerting/crawl-failure.js'
import { aiRedisConnection, redisConnection } from '../connection.js'
import type { AuditFlowInput } from '../flow.js'
import { QUEUE_NAMES } from '../queues.js'
import { checkCollectRateLimit } from '../rate-limit.js'
import { resolveCollectOutcome } from './degraded.js'

export const collectWorker = new Worker<AuditFlowInput, CollectResult>(
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
      const outcome = resolveCollectOutcome(result)
      await recordCrawlOutcome(aiRedisConnection, hostname, outcome.status).toResult()

      if (outcome.status === 'error') {
        await db
          .update(audits)
          .set({ status: 'failed', completedAt: new Date() })
          .where(eq(audits.id, auditId))
        throw new Error(outcome.message)
      }

      return outcome.value
    })
  },
  { connection: redisConnection, concurrency: 5 },
)
