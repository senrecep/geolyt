import { db, reports } from '@geolyt/db'
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
      const report = await db.query.reports.findFirst({
        where: eq(reports.shareToken, token),
      })

      if (!report || !report.publicUrl) {
        set.status = 404
        return { error: 'Report not found' }
      }

      set.status = 302
      return Response.redirect(report.publicUrl, 302)
    },
    {
      params: t.Object({
        token: t.String({ format: 'uuid' }),
      }),
    },
  )
