import { db } from '@geolyt/db'
import { sql } from 'drizzle-orm'
import { Elysia } from 'elysia'

export const healthRoute = new Elysia().get('/health', async () => {
  await db.execute(sql`select 1`)
  return { status: 'ok' }
})
