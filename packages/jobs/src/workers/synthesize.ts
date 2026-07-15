import { ModelChain, type RedisLike, narrativeModels, synthesize } from '@geolyt/ai-core'
import { auditResults, audits, db, usage } from '@geolyt/db'
import type { AuditResult, Finding, ScoreResult } from '@geolyt/shared'
import { Worker } from 'bullmq'
import { eq } from 'drizzle-orm'
import { aiRedisConnection, redisConnection } from '../connection.js'
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
    const { auditId } = job.data

    await db.update(audits).set({ status: 'synthesizing' }).where(eq(audits.id, auditId))

    const children = await job.getChildrenValues()
    const scoreResult = Object.values(children)[0] as ScoreResult | undefined
    if (!scoreResult) {
      throw new Error('Missing score result')
    }

    let auditResult = buildAuditResult(job.data, scoreResult)

    const auditRow = await db.query.audits.findFirst({
      where: eq(audits.id, auditId),
      columns: { clientId: true },
    })

    try {
      const chain = new ModelChain(narrativeModels(), {
        redis: aiRedisConnection as unknown as RedisLike,
      })
      const model = await chain.pickModel()

      if (model) {
        const synthesis = await synthesize(auditResult, model)

        if (synthesis.ok) {
          auditResult = {
            ...auditResult,
            findings: mergeFindings(auditResult.findings, synthesis.value.output.findings),
            aiSynthesisUsed: true,
          }

          await db.insert(usage).values({
            clientId: auditRow?.clientId ?? null,
            period: new Date().toISOString().slice(0, 7),
            aiTokensCached: synthesis.value.usage.cachedPromptTokens,
            aiTokensUncached: Math.max(
              0,
              synthesis.value.usage.promptTokens - synthesis.value.usage.cachedPromptTokens,
            ),
            aiTokensOutput: synthesis.value.usage.completionTokens,
          })
        }
      }
    } catch {
      // AI synthesis is optional; fall back to the template result.
    }

    await db.insert(auditResults).values({
      auditId,
      data: auditResult,
    })

    return auditResult
  },
  { connection: redisConnection, concurrency: 3 },
)
