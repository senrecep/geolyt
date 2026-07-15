import { type Span, type Tracer, context, trace } from '@opentelemetry/api'

let tracer: Tracer | null = null

export function setTracer(instance: Tracer): void {
  tracer = instance
}

export function getTracer(): Tracer {
  return tracer ?? trace.getTracer('geolyt', '0.0.1')
}

export async function withSpan<T>(
  name: string,
  attributes: Record<string, string | number | boolean | undefined>,
  fn: (span: Span) => Promise<T> | T,
): Promise<T> {
  const activeTracer = getTracer()
  const parentContext = context.active()

  return activeTracer.startActiveSpan(name, {}, parentContext, async (span) => {
    for (const [key, value] of Object.entries(attributes)) {
      if (value !== undefined) {
        span.setAttribute(key, value)
      }
    }

    try {
      return await fn(span)
    } finally {
      span.end()
    }
  })
}
