import { scoreAll } from '@geolyt/core'
import { audits, db } from '@geolyt/db'
import type { PageData, ScoreResult } from '@geolyt/shared'
import { Worker } from 'bullmq'
import { eq } from 'drizzle-orm'
import { redisConnection } from '../connection.js'
import type { AuditFlowInput } from '../flow.js'
import { QUEUE_NAMES } from '../queues.js'

export const scoreWorker = new Worker<AuditFlowInput, ScoreResult>(
  QUEUE_NAMES.score,
  async (job) => {
    const { auditId } = job.data

    await db.update(audits).set({ status: 'scoring' }).where(eq(audits.id, auditId))

    const children = await job.getChildrenValues()
    const pageData = Object.values(children)[0] as PageData | undefined
    if (!pageData) {
      throw new Error('Missing collected page data')
    }

    const result = scoreAll(pageData)
    if (!result.ok) {
      await db
        .update(audits)
        .set({ status: 'failed', completedAt: new Date() })
        .where(eq(audits.id, auditId))
      throw new Error(result.errors.map((e) => `${e.code}: ${e.description}`).join(', '))
    }

    return result.value
  },
  { connection: redisConnection, concurrency: 20 },
)
