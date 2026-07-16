import { auditResults, audits, db, reports } from '@geolyt/db'
import { buildShareLandingHtml } from '@geolyt/jobs'
import type { AuditResult } from '@geolyt/shared'
import { eq } from 'drizzle-orm'
import { Elysia, t } from 'elysia'

export const reportsRoute = new Elysia({ prefix: '/reports' })
  .get('/:id', async ({ params: { id }, set }) => {
    const report = await db.query.reports.findFirst({
      where: eq(reports.auditId, id),
    })

    if (!report || !report.publicUrl) {
      set.status = 404
      return { error: 'Report not found' }
    }

    set.status = 302
    return Response.redirect(report.publicUrl, 302)
  })
  .get(
    '/share/:token',
    async ({ params: { token }, set }) => {
      const rows = await db
        .select({ report: reports, audit: audits, result: auditResults })
        .from(reports)
        .innerJoin(audits, eq(reports.auditId, audits.id))
        .innerJoin(auditResults, eq(audits.id, auditResults.auditId))
        .where(eq(reports.shareToken, token))
        .limit(1)

      const row = rows[0]
      if (!row || !row.report.publicUrl) {
        set.status = 404
        return { error: 'Report not found' }
      }

      const auditResult = row.result.data as AuditResult
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.GEOLYT_API_URL ?? ''
      const shareUrl = `${baseUrl}/reports/share/${token}`

      const html = buildShareLandingHtml({
        url: row.audit.url,
        compositeScore: auditResult.scores.composite,
        shareUrl,
        pdfUrl: row.report.publicUrl,
        brandName: 'Geolyt',
        logoUrl: `${baseUrl}/logo.png`,
      })

      set.headers['Content-Type'] = 'text/html; charset=utf-8'
      return html
    },
    {
      params: t.Object({
        token: t.String({ format: 'uuid' }),
      }),
    },
  )
