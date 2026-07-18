import { randomUUID } from 'node:crypto'
import { audits, db, reports } from '@geolyt/db'
import type { AuditResult } from '@geolyt/shared'
import { logger, withSpan } from '@geolyt/shared'
import { Worker } from 'bullmq'
import { eq } from 'drizzle-orm'
import { Err } from 'tsentials/errors'
import { ResultAsync } from 'tsentials/result'
import { redisConnection } from '../connection.js'
import type { AuditFlowInput } from '../flow.js'
import { generatePdfFromHtml } from '../pdf/generate-pdf.js'
import { QUEUE_NAMES } from '../queues.js'
import {
  createR2Client,
  getOptionalR2ConfigFromEnv,
  getR2ConfigFromEnv,
  uploadReport,
} from '../storage/r2.js'
import { buildReportHtml } from '../templates/report.html.js'

const UPLOAD_TIMEOUT_MS = 10_000

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
    `_Generated at ${new Date(audit.generatedAt).toISOString()}_`,
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

        // Unlike the PDF deliverable, text uploads are best-effort: without R2 config
        // (or when upload fails, e.g. placeholder credentials in dev) the report row
        // keeps publicUrl null and the dashboard shows no preview instead of failing
        // the whole audit.
        const r2Config = getOptionalR2ConfigFromEnv()
        if (r2Config) {
          const uploaded = await ResultAsync.try(
            () =>
              Promise.race([
                uploadReport(
                  createR2Client(r2Config),
                  storageKey,
                  Buffer.from(content, 'utf-8'),
                  'text/markdown; charset=utf-8',
                ),
                new Promise<never>((_, reject) =>
                  setTimeout(() => reject(new Error('timed out')), UPLOAD_TIMEOUT_MS),
                ),
              ]),
            (error) =>
              Err.unexpected('Jobs.ReportUploadFailed', `Markdown upload failed: ${error}`),
          ).toResult()

          if (uploaded.ok) {
            publicUrl = uploaded.value.publicUrl
          } else {
            logger.warn(
              { auditId, errors: uploaded.errors.map((e) => e.description) },
              'markdown report upload failed; stored without public URL',
            )
          }
        }
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
        .set({
          status: auditResult.status === 'degraded' ? 'degraded' : 'completed',
          completedAt: new Date(),
        })
        .where(eq(audits.id, auditId))

      return { storageKey, publicUrl, content }
    })
  },
  { connection: redisConnection, concurrency: 4 },
)
