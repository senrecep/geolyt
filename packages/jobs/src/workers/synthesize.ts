import { ModelChain, type RedisLike, narrativeModels, synthesize } from '@geolyt/ai-core'
import { auditResults, audits, db, usage } from '@geolyt/db'
import type { AiUsage, AuditResult, Finding, ScoreResult } from '@geolyt/shared'
import { withSpan } from '@geolyt/shared'
import { Worker } from 'bullmq'
import { eq } from 'drizzle-orm'
import { Err } from 'tsentials/errors'
import { ResultAsync } from 'tsentials/result'
import { aiRedisConnection, redisConnection } from '../connection.js'
import type { AuditFlowInput } from '../flow.js'
import { QUEUE_NAMES } from '../queues.js'

export function buildSynthesisUsageRow(input: {
  clientId: string | null
  auditId: string
  modelId: string
  period: string
  usage: AiUsage
}): typeof usage.$inferInsert {
  return {
    clientId: input.clientId,
    auditId: input.auditId,
    period: input.period,
    model: input.modelId,
    aiTokensCached: input.usage.cachedPromptTokens,
    aiTokensUncached: Math.max(0, input.usage.promptTokens - input.usage.cachedPromptTokens),
    aiTokensOutput: input.usage.completionTokens,
  }
}

function buildAuditResult(input: AuditFlowInput, scoreResult: ScoreResult): AuditResult {
  return {
    auditId: input.auditId,
    url: input.url,
    status: scoreResult.degraded ? 'degraded' : 'completed',
    scores: scoreResult.scores,
    findings: scoreResult.findings,
    crawlerAccess: scoreResult.crawlerAccess,
    generatedAt: new Date(),
    aiSynthesisUsed: false,
  }
}

function mergeFindings(original: Finding[], ai: Finding[]): Finding[] {
  const seen = new Set(original.map((f) => f.code))
  const merged = [...original]
  for (const finding of ai) {
    if (!seen.has(finding.code)) {
      merged.push(finding)
      seen.add(finding.code)
    }
  }
  return merged
}

export const synthesizeWorker = new Worker<AuditFlowInput, AuditResult>(
  QUEUE_NAMES.synthesize,
  async (job) => {
    const { auditId, url } = job.data

    return withSpan(
      'jobs.synthesize',
      { audit_id: auditId, url, stage: 'synthesize' },
      async () => {
        await db.update(audits).set({ status: 'synthesizing' }).where(eq(audits.id, auditId))

        const children = await job.getChildrenValues()
        const scoreResult = Object.values(children)[0] as ScoreResult | undefined
        if (!scoreResult) {
          throw new Error('Missing score result')
        }

        let auditResult = buildAuditResult(job.data, scoreResult)

        // A degraded audit (AI crawlers blocked) has nothing to synthesize from —
        // scores are all 0 and the finding is already authored — so skip the model
        // call and the usage insert entirely.
        if (!scoreResult.degraded) {
          const auditRow = await db.query.audits.findFirst({
            where: eq(audits.id, auditId),
            columns: { clientId: true },
          })

          // AI synthesis is optional; on failure the template result stands.
          await ResultAsync.try(
            async () => {
              const chain = new ModelChain(narrativeModels(), {
                redis: aiRedisConnection as unknown as RedisLike,
              })
              const model = await chain.pickModel()
              if (!model) {
                return
              }

              const synthesis = await synthesize(auditResult, model)
              if (!synthesis.ok) {
                return
              }

              auditResult = {
                ...auditResult,
                findings: mergeFindings(auditResult.findings, synthesis.value.output.findings),
                aiSynthesisUsed: true,
              }

              await db.insert(usage).values(
                buildSynthesisUsageRow({
                  clientId: auditRow?.clientId ?? null,
                  auditId,
                  modelId: model.modelId,
                  period: new Date().toISOString().slice(0, 7),
                  usage: synthesis.value.usage,
                }),
              )
            },
            (error) => Err.unexpected('Jobs.SynthesisSkipped', `AI synthesis skipped: ${error}`),
          ).toResult()
        }

        await db.insert(auditResults).values({
          auditId,
          data: auditResult,
        })

        return auditResult
      },
    )
  },
  { connection: redisConnection, concurrency: 3 },
)
