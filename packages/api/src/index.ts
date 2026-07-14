import swagger from '@elysiajs/swagger'
import { Elysia } from 'elysia'
import { auditsRoute } from './routes/audits.js'
import { healthRoute } from './routes/health.js'

export function createApp() {
  return new Elysia()
    .use(swagger({ path: '/docs' }))
    .use(healthRoute)
    .use(auditsRoute)
    .onError(({ code, error, set }) => {
      set.status = code === 'NOT_FOUND' ? 404 : 500
      return {
        error: error instanceof Error ? error.message : 'Unexpected error',
      }
    })
}
