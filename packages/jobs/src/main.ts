import { startMonthlyReAuditScheduler } from './scheduler/runner.js'
import { initTracing } from './tracing.js'

// Initialize OpenTelemetry when OTEL_EXPORTER_OTLP_ENDPOINT is configured.
initTracing('geolyt-jobs')

// Importing the worker modules registers them with BullMQ.
import './workers/collect.js'
import './workers/report.js'
import './workers/score.js'
import './workers/synthesize.js'

// Start the monthly re-audit cron scheduler.
startMonthlyReAuditScheduler()

console.info('Geolyt jobs worker started')
