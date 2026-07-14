import { audits, db, reports } from '@geolyt/db'
import type { AuditResult } from '@geolyt/shared'
import { Worker } from 'bullmq'
import { eq } from 'drizzle-orm'
import { redisConnection } from '../connection.js'
import type { AuditFlowInput } from '../flow.js'
import { QUEUE_NAMES } from '../queues.js'

function buildMarkdownReport(audit: AuditResult): string {
  const lines = [
    '# GEO Audit Report',
    '',
    `**URL:** ${audit.url}`,
    `**GEO Score:** ${audit.scores.composite}/100`,
    '',
    '## Score Breakdown',
    `- AI Citability: ${audit.scores.aiCitability}`,
    `- Brand Authority: ${audit.scores.brandAuthority}`,
    `- Content Quality: ${audit.scores.contentQuality}`,
    `- Technical Foundation: ${audit.scores.technicalFoundation}`,
    `- Structured Data: ${audit.scores.structuredData}`,
    `- Platform Optimization: ${audit.scores.platformOptimization}`,
    '',
    '## Findings',
    ...audit.findings.map((f) => `- **${f.title}** (${f.severity}): ${f.description}`),
    '',
    `_Generated at ${audit.generatedAt.toISOString()}_`,
  ]
  return lines.join('\n')
}

export const reportWorker = new Worker<AuditFlowInput>(
  QUEUE_NAMES.report,
  async (job) => {
    const { auditId, reportFormat } = job.data

    await db.update(audits).set({ status: 'reporting' }).where(eq(audits.id, auditId))

    const children = await job.getChildrenValues()
    const auditResult = Object.values(children)[0] as AuditResult | undefined
    if (!auditResult) {
      throw new Error('Missing audit result')
    }

    const content = buildMarkdownReport(auditResult)
    const storageKey = `reports/${auditId}/report.md`

    await db.insert(reports).values({
      auditId,
      format: reportFormat,
      storageKey,
    })

    await db
      .update(audits)
      .set({ status: 'completed', completedAt: new Date() })
      .where(eq(audits.id, auditId))

    return { storageKey, content }
  },
  { connection: redisConnection, concurrency: 4 },
)
