import { db } from '@geolyt/db'
import { aiRedisConnection } from '@geolyt/jobs'
import { sql } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { Err } from 'tsentials/errors'
import { ResultAsync } from 'tsentials/result'

const CHECK_TIMEOUT_MS = 2000

function check(name: string, run: () => Promise<unknown>): ResultAsync<void> {
  return ResultAsync.try(
    async () => {
      await Promise.race([
        run(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timed out')), CHECK_TIMEOUT_MS),
        ),
      ])
    },
    (error) => Err.unexpected(`Health.${name}`, `${name} check failed: ${error}`),
  )
}

export const healthRoute = new Elysia().get('/health', async ({ set }) => {
  const [database, redis] = await Promise.all([
    check('Database', () => db.execute(sql`select 1`)).toResult(),
    check('Redis', () => aiRedisConnection.ping()).toResult(),
  ])

  const healthy = database.ok && redis.ok
  if (!healthy) {
    set.status = 503
  }

  return {
    status: healthy ? 'ok' : 'degraded',
    checks: {
      database: database.ok ? 'ok' : 'error',
      redis: redis.ok ? 'ok' : 'error',
    },
  }
})
