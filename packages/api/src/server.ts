import { logger } from '@geolyt/shared/logger'
import { createApp } from './index.js'
import { initTracing } from './tracing.js'

// Initialize OpenTelemetry when OTEL_EXPORTER_OTLP_ENDPOINT is configured.
initTracing('geolyt-api')

const port = Number(process.env.API_PORT ?? 3000)

createApp().listen(port, ({ hostname, port }) => {
  logger.info(`API running at http://${hostname}:${port}`)
})
