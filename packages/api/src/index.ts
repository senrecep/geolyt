import swagger from '@elysiajs/swagger'
import { Elysia } from 'elysia'
import { auth } from './auth.js'
import { auditsRoute } from './routes/audits.js'
import { healthRoute } from './routes/health.js'
import { reportsRoute } from './routes/reports.js'

export function createApp() {
  return new Elysia()
    .use(swagger({ path: '/docs' }))
    .use(healthRoute)
    .all('/api/auth/*', async ({ request }) => auth.handler(request))
    .use(auditsRoute)
    .use(reportsRoute)
    .onError(({ code, error, set }) => {
      set.status = code === 'NOT_FOUND' ? 404 : 500
      return {
        error: error instanceof Error ? error.message : 'Unexpected error',
      }
    })
}
