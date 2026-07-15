import { computeCompositeScore, scoreAll, scoreBrandAuthority } from '@geolyt/core'
import { audits, db } from '@geolyt/db'
import type { PageData, ScoreResult } from '@geolyt/shared'
import { Worker } from 'bullmq'
import { eq } from 'drizzle-orm'
import { aiRedisConnection, redisConnection } from '../connection.js'
import type { AuditFlowInput } from '../flow.js'
import { QUEUE_NAMES } from '../queues.js'

function formatErrors(errors: ReadonlyArray<{ code: string; description: string }>): string {
  return errors.map((e) => `${e.code}: ${e.description}`).join(', ')
}

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

    const baseResult = scoreAll(pageData)
    if (!baseResult.ok) {
      await db
        .update(audits)
        .set({ status: 'failed', completedAt: new Date() })
        .where(eq(audits.id, auditId))
      throw new Error(formatErrors(baseResult.errors))
    }

    const domain = new URL(pageData.url).hostname
    const brandResult = await scoreBrandAuthority({
      domain,
      redis: aiRedisConnection,
    })

    const brandAuthority = brandResult.ok ? brandResult.value.score : 0
    const brandFindings = brandResult.ok ? brandResult.value.findings : []

    const recomposite = computeCompositeScore({
      ...baseResult.value.scores,
      brandAuthority,
    })
    if (!recomposite.ok) {
      await db
        .update(audits)
        .set({ status: 'failed', completedAt: new Date() })
        .where(eq(audits.id, auditId))
      throw new Error(formatErrors(recomposite.errors))
    }

    const result: ScoreResult = {
      scores: recomposite.value,
      findings: [...baseResult.value.findings, ...brandFindings],
      crawlerAccess: baseResult.value.crawlerAccess,
    }

    return result
  },
  { connection: redisConnection, concurrency: 20 },
)
