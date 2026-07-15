import { describe, expect, it } from 'bun:test'
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base'
import { setTracer, withSpan } from '../../observability/tracing.js'

describe('withSpan', () => {
  it('records attributes on the active span', async () => {
    const exporter = new InMemorySpanExporter()
    const provider = new BasicTracerProvider({
      spanProcessors: [new SimpleSpanProcessor(exporter)],
    })

    const tracer = provider.getTracer('test')
    setTracer(tracer)

    await withSpan(
      'test.span',
      { audit_id: 'audit-1', url: 'https://example.com', score: 75 },
      async () => 'done',
    )

    const spans = exporter.getFinishedSpans()
    expect(spans).toHaveLength(1)
    const span = spans[0]
    expect(span?.name).toBe('test.span')
    expect(span?.attributes.audit_id).toBe('audit-1')
    expect(span?.attributes.url).toBe('https://example.com')
    expect(span?.attributes.score).toBe(75)
  })
})
