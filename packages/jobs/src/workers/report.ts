import { randomUUID } from 'node:crypto'
import { audits, db, reports } from '@geolyt/db'
import type { AuditResult } from '@geolyt/shared'
import { withSpan } from '@geolyt/shared'
import { Worker } from 'bullmq'
import { eq } from 'drizzle-orm'
import { redisConnection } from '../connection.js'
import type { AuditFlowInput } from '../flow.js'
import { generatePdfFromHtml } from '../pdf/generate-pdf.js'
import { QUEUE_NAMES } from '../queues.js'
import { createR2Client, getR2ConfigFromEnv, uploadReport } from '../storage/r2.js'
import { buildReportHtml } from '../templates/report.html.js'

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
    const { auditId, reportFormat, url } = job.data

    return withSpan('jobs.report', { audit_id: auditId, url, stage: 'report' }, async () => {
      await db.update(audits).set({ status: 'reporting' }).where(eq(audits.id, auditId))

      const children = await job.getChildrenValues()
      const auditResult = Object.values(children)[0] as AuditResult | undefined
      if (!auditResult) {
        throw new Error('Missing audit result')
      }

      const auditRow = await db.query.audits.findFirst({
        where: eq(audits.id, auditId),
        with: { site: { with: { client: true } } },
      })
      const whiteLabel = auditRow?.site?.client?.whiteLabelConfig ?? undefined

      let content: string
      let storageKey: string
      let publicUrl: string | null = null

      if (reportFormat === 'pdf') {
        content = buildReportHtml(auditResult, whiteLabel)
        storageKey = `reports/${auditId}/geo-report.pdf`

        const pdfBuffer = await generatePdfFromHtml(content)
        const r2 = createR2Client(getR2ConfigFromEnv())
        const uploaded = await uploadReport(r2, storageKey, pdfBuffer, 'application/pdf')
        publicUrl = uploaded.publicUrl
      } else {
        content = buildMarkdownReport(auditResult)
        storageKey = `reports/${auditId}/report.md`
      }

      await db.insert(reports).values({
        auditId,
        format: reportFormat,
        storageKey,
        publicUrl,
        shareToken: randomUUID(),
      })

      await db
        .update(audits)
        .set({ status: 'completed', completedAt: new Date() })
        .where(eq(audits.id, auditId))

      return { storageKey, publicUrl, content }
    })
  },
  { connection: redisConnection, concurrency: 4 },
)
