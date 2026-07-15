import { apiKeys, auditResults, audits, db, reports } from '@geolyt/db'
import { enqueueAudit } from '@geolyt/jobs'
import { AuditJobInput } from '@geolyt/shared'
import { eq } from 'drizzle-orm'
import { Elysia, t } from 'elysia'
import { auth } from '../auth.js'

export const auditsRoute = new Elysia({ prefix: '/audits' })
  .onBeforeHandle(async ({ headers, request, set }) => {
    const key = headers['x-api-key']
    if (typeof key === 'string' && key.length > 0) {
      const records = await db.select().from(apiKeys).where(eq(apiKeys.isActive, true))
      for (const record of records) {
        if (await Bun.password.verify(key, record.keyHash)) {
          await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, record.id))
          return
        }
      }

      set.status = 401
      return { error: 'Invalid API key' }
    }

    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
  })
  .post(
    '/',
    async ({ body, set }) => {
      const input = AuditJobInput.parse(body)

      const inserted = await db
        .insert(audits)
        .values({
          url: input.url,
          reportFormat: input.reportFormat,
          status: 'pending',
        })
        .returning()

      const audit = inserted[0]
      if (!audit) {
        set.status = 500
        return { error: 'Failed to create audit' }
      }

      await enqueueAudit({
        auditId: audit.id,
        url: input.url,
        reportFormat: input.reportFormat,
      })

      set.status = 202
      return { audit_id: audit.id, status: audit.status }
    },
    {
      body: t.Object({
        url: t.String({ format: 'uri' }),
        reportFormat: t.Optional(
          t.Union([t.Literal('json'), t.Literal('markdown'), t.Literal('pdf')]),
        ),
      }),
    },
  )
  .get('/:id', async ({ params: { id }, set }) => {
    const audit = await db.query.audits.findFirst({
      where: eq(audits.id, id),
    })

    if (!audit) {
      set.status = 404
      return { error: 'Audit not found' }
    }

    const resultRow = await db.query.auditResults.findFirst({
      where: eq(auditResults.auditId, id),
    })

    return {
      audit_id: audit.id,
      url: audit.url,
      status: audit.status,
      result: resultRow?.data ?? null,
      created_at: audit.createdAt,
      completed_at: audit.completedAt,
    }
  })
  .get('/:id/report', async ({ params: { id }, set }) => {
    const report = await db.query.reports.findFirst({
      where: eq(reports.auditId, id),
    })

    if (!report) {
      set.status = 404
      return { error: 'Report not ready' }
    }

    return {
      audit_id: id,
      format: report.format,
      storage_key: report.storageKey,
      public_url: report.publicUrl,
    }
  })
