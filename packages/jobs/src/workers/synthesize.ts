import { auditResults, audits, db } from '@geolyt/db'
import type { AuditResult, ScoreResult } from '@geolyt/shared'
import { Worker } from 'bullmq'
import { eq } from 'drizzle-orm'
import { redisConnection } from '../connection.js'
import type { AuditFlowInput } from '../flow.js'
import { QUEUE_NAMES } from '../queues.js'

function buildAuditResult(input: AuditFlowInput, scoreResult: ScoreResult): AuditResult {
  return {
    auditId: input.auditId,
    url: input.url,
    status: 'completed',
    scores: scoreResult.scores,
    findings: scoreResult.findings,
    crawlerAccess: scoreResult.crawlerAccess,
    generatedAt: new Date(),
    aiSynthesisUsed: false,
  }
}

export const synthesizeWorker = new Worker<AuditFlowInput, AuditResult>(
  QUEUE_NAMES.synthesize,
  async (job) => {
    const { auditId } = job.data

    await db.update(audits).set({ status: 'synthesizing' }).where(eq(audits.id, auditId))

    const children = await job.getChildrenValues()
    const scoreResult = Object.values(children)[0] as ScoreResult | undefined
    if (!scoreResult) {
      throw new Error('Missing score result')
    }

    const auditResult = buildAuditResult(job.data, scoreResult)

    await db.insert(auditResults).values({
      auditId,
      data: auditResult,
    })

    return auditResult
  },
  { connection: redisConnection, concurrency: 3 },
)
