import { collectPage } from '@geolyt/core'
import { audits, db } from '@geolyt/db'
import type { PageData } from '@geolyt/shared'
import { Worker } from 'bullmq'
import { eq } from 'drizzle-orm'
import { redisConnection } from '../connection.js'
import type { AuditFlowInput } from '../flow.js'
import { QUEUE_NAMES } from '../queues.js'

export const collectWorker = new Worker<AuditFlowInput, PageData>(
  QUEUE_NAMES.collect,
  async (job) => {
    const { auditId, url } = job.data

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
  },
  { connection: redisConnection, concurrency: 5 },
)
