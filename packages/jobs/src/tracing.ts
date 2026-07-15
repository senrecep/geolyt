import { setTracer } from '@geolyt/shared'
import { trace } from '@opentelemetry/api'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions'

export function initTracing(serviceName: string): void {
  if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    return
  }

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: serviceName,
    }),
    traceExporter: new OTLPTraceExporter(),
  })

  sdk.start()
  setTracer(trace.getTracer(serviceName))

  process.on('SIGTERM', () => {
    sdk.shutdown().catch(() => {})
  })
}
