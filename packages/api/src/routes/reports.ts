import { db, reports } from '@geolyt/db'
import { eq } from 'drizzle-orm'
import { Elysia } from 'elysia'

export const reportsRoute = new Elysia({ prefix: '/reports' }).get(
  '/:id',
  async ({ params: { id }, set }) => {
    const report = await db.query.reports.findFirst({
      where: eq(reports.auditId, id),
    })

    if (!report || !report.publicUrl) {
      set.status = 404
      return { error: 'Report not found' }
    }

    set.status = 302
    return Response.redirect(report.publicUrl, 302)
  },
)
