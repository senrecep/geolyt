import { apiKeys, auditResults, audits, db, reports } from '@geolyt/db'
import { enqueueAudit, reportQueue } from '@geolyt/jobs'
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
  .get('/:id/stream', async ({ params: { id }, set }) => {
    const job = await reportQueue.getJob(id)
    if (!job) {
      set.status = 404
      return { error: 'Audit job not found' }
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        }

        let finished = false
        let checks = 0
        const maxChecks = 360

        while (!finished && checks < maxChecks) {
          checks++
          const state = await job.getState()
          const progress = typeof job.progress === 'number' ? job.progress : 0
          send('status', { status: state, progress })

          if (state === 'completed' || state === 'failed') {
            finished = true
            controller.close()
            break
          }

          await new Promise((resolve) => setTimeout(resolve, 5000))
        }

        if (!finished) {
          send('status', { status: 'timeout', progress: 0 })
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  })
