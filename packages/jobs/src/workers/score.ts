import { judgeEeat, scoringModels } from '@geolyt/ai-core'
import { computeCompositeScore, scoreAll, scoreBrandAuthority } from '@geolyt/core'
import { audits, db } from '@geolyt/db'
import type { CollectResult, Finding, ScoreResult } from '@geolyt/shared'
import { withSpan } from '@geolyt/shared'
import { Worker } from 'bullmq'
import { eq } from 'drizzle-orm'
import { aiRedisConnection, redisConnection } from '../connection.js'
import type { AuditFlowInput } from '../flow.js'
import { QUEUE_NAMES } from '../queues.js'
import { buildCrawlerBlockedScore } from './degraded.js'

function formatErrors(errors: ReadonlyArray<{ code: string; description: string }>): string {
  return errors.map((e) => `${e.code}: ${e.description}`).join(', ')
}

export const scoreWorker = new Worker<AuditFlowInput, ScoreResult>(
  QUEUE_NAMES.score,
  async (job) => {
    const { auditId, url } = job.data

    return withSpan('jobs.score', { audit_id: auditId, url, stage: 'score' }, async () => {
      await db.update(audits).set({ status: 'scoring' }).where(eq(audits.id, auditId))

      const children = await job.getChildrenValues()
      const collectResult = Object.values(children)[0] as CollectResult | undefined
      if (!collectResult) {
        throw new Error('Missing collect result')
      }

      const { pageData } = collectResult
      if (!pageData) {
        return buildCrawlerBlockedScore(url)
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

      const contentFindings: Finding[] = []
      let contentQuality = 0
      if (process.env.GOOGLE_AI_API_KEY) {
        const [eeatModel] = scoringModels()
        if (eeatModel) {
          const eeatResult = await judgeEeat(pageData, eeatModel)
          if (eeatResult.ok) {
            contentQuality = eeatResult.value.output.score
            contentFindings.push(...eeatResult.value.output.findings)
          } else {
            contentFindings.push({
              code: 'AI.EeatJudgeFailed',
              title: 'E-E-A-T judge unavailable',
              description: eeatResult.errors.map((e) => e.description).join(', '),
              severity: 'medium',
            })
          }
        } else {
          contentFindings.push({
            code: 'AI.EeatModelMissing',
            title: 'No E-E-A-T model available',
            description: 'No scoring model configured for content quality.',
            severity: 'low',
          })
        }
      } else {
        contentFindings.push({
          code: 'AI.EeatKeyMissing',
          title: 'E-E-A-T scoring skipped',
          description: 'GOOGLE_AI_API_KEY is not configured; content quality defaulted to 0.',
          severity: 'low',
        })
      }

      const recomposite = computeCompositeScore({
        ...baseResult.value.scores,
        brandAuthority,
        contentQuality,
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
        findings: [...baseResult.value.findings, ...brandFindings, ...contentFindings],
        crawlerAccess: baseResult.value.crawlerAccess,
        degraded: false,
      }

      return result
    })
  },
  { connection: redisConnection, concurrency: 20 },
)
