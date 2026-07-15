import { calculateScoreChange } from '@geolyt/core'
import { apiKeys, auditDeltas, audits, clients, db, sites } from '@geolyt/db'
import { eq } from 'drizzle-orm'
import { Elysia, t } from 'elysia'
import { auth } from '../auth.js'

async function resolveClientId(headers: Headers): Promise<string | null> {
  const key = headers.get('x-api-key')
  if (key) {
    const records = await db.select().from(apiKeys).where(eq(apiKeys.isActive, true))
    for (const record of records) {
      if (await Bun.password.verify(key, record.keyHash)) {
        await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, record.id))
        return record.clientId ?? null
      }
    }
    return null
  }

  const session = await auth.api.getSession({ headers })
  if (!session?.user?.email) {
    return null
  }

  const client = await db.query.clients.findFirst({
    where: eq(clients.email, session.user.email),
  })
  return client?.id ?? null
}

export const sitesRoute = new Elysia({ prefix: '/sites' })
  .get(
    '/:id/deltas',
    async ({ params: { id }, request, set }) => {
      const clientId = await resolveClientId(request.headers)
      if (!clientId) {
        set.status = 401
        return { error: 'Unauthorized' }
      }

      const site = await db.query.sites.findFirst({
        where: eq(sites.id, id),
      })
      if (!site || site.clientId !== clientId) {
        set.status = 404
        return { error: 'Site not found' }
      }

      const deltas = await db.query.auditDeltas.findMany({
        where: eq(auditDeltas.siteId, id),
        orderBy: (deltas, { desc }) => [desc(deltas.createdAt)],
      })

      return deltas.map((delta) => ({
        id: delta.id,
        site_id: delta.siteId,
        audit_a_id: delta.auditAId,
        audit_b_id: delta.auditBId,
        score_change: delta.scoreChange,
        created_at: delta.createdAt,
      }))
    },
    {
      params: t.Object({
        id: t.String({ format: 'uuid' }),
      }),
    },
  )
  .post(
    '/:id/deltas',
    async ({ params: { id }, request, set }) => {
      const clientId = await resolveClientId(request.headers)
      if (!clientId) {
        set.status = 401
        return { error: 'Unauthorized' }
      }

      const site = await db.query.sites.findFirst({
        where: eq(sites.id, id),
      })
      if (!site || site.clientId !== clientId) {
        set.status = 404
        return { error: 'Site not found' }
      }

      const recentAudits = await db.query.audits.findMany({
        where: eq(audits.siteId, id),
        orderBy: (audits, { desc }) => [desc(audits.completedAt)],
        limit: 2,
        with: { result: true },
      })

      if (recentAudits.length < 2 || !recentAudits[0]?.result || !recentAudits[1]?.result) {
        set.status = 422
        return { error: 'At least two completed audits with results are required' }
      }

      const [auditB, auditA] = recentAudits
      const scoreChange = calculateScoreChange(auditA.result.data, auditB.result.data)

      const inserted = await db
        .insert(auditDeltas)
        .values({
          siteId: id,
          auditAId: auditA.id,
          auditBId: auditB.id,
          scoreChange,
        })
        .returning()

      const delta = inserted[0]
      if (!delta) {
        set.status = 500
        return { error: 'Failed to create delta' }
      }

      return {
        id: delta.id,
        site_id: delta.siteId,
        audit_a_id: delta.auditAId,
        audit_b_id: delta.auditBId,
        score_change: delta.scoreChange,
        created_at: delta.createdAt,
      }
    },
    {
      params: t.Object({
        id: t.String({ format: 'uuid' }),
      }),
    },
  )
