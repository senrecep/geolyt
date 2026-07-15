import { apiKeys, clients, db } from '@geolyt/db'
import { WhiteLabelConfig } from '@geolyt/shared'
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

export const clientsRoute = new Elysia({ prefix: '/clients' })
  .get('/me', async ({ request, set }) => {
    const clientId = await resolveClientId(request.headers)
    if (!clientId) {
      set.status = 401
      return { error: 'Unauthorized' }
    }

    const client = await db.query.clients.findFirst({
      where: eq(clients.id, clientId),
    })

    if (!client) {
      set.status = 404
      return { error: 'Client not found' }
    }

    return {
      id: client.id,
      name: client.name,
      email: client.email,
      plan: client.plan,
      monthly_quota: client.monthlyQuota,
      white_label_config: client.whiteLabelConfig,
    }
  })
  .patch(
    '/me/white-label',
    async ({ body, request, set }) => {
      const clientId = await resolveClientId(request.headers)
      if (!clientId) {
        set.status = 401
        return { error: 'Unauthorized' }
      }

      const parsed = WhiteLabelConfig.safeParse(body)
      if (!parsed.success) {
        set.status = 400
        return { error: 'Invalid white-label config', details: parsed.error.format() }
      }

      const updated = await db
        .update(clients)
        .set({ whiteLabelConfig: parsed.data })
        .where(eq(clients.id, clientId))
        .returning()

      const updatedClient = updated[0]
      if (!updatedClient) {
        set.status = 500
        return { error: 'Failed to update white-label config' }
      }

      return {
        id: updatedClient.id,
        white_label_config: updatedClient.whiteLabelConfig,
      }
    },
    {
      body: t.Object({
        companyName: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
        logoUrl: t.Optional(t.String({ format: 'uri' })),
        faviconUrl: t.Optional(t.String({ format: 'uri' })),
        primaryColor: t.Optional(t.String()),
      }),
    },
  )
