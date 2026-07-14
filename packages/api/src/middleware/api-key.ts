import { apiKeys, db } from '@geolyt/db'
import { eq } from 'drizzle-orm'
import { Elysia } from 'elysia'

export const apiKeyAuth = new Elysia({ name: 'api-key-auth' }).onBeforeHandle(
  async ({ headers, set }) => {
    const key = headers['x-api-key']
    if (typeof key !== 'string' || key.length === 0) {
      set.status = 401
      return { error: 'Missing API key' }
    }

    const records = await db.select().from(apiKeys).where(eq(apiKeys.isActive, true))
    for (const record of records) {
      if (await Bun.password.verify(key, record.keyHash)) {
        await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, record.id))
        return
      }
    }

    set.status = 401
    return { error: 'Invalid API key' }
  },
)
