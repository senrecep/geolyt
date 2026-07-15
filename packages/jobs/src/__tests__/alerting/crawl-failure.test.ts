import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import {
  type CrawlAlert,
  recordCrawlOutcome,
  setAlertEmitter,
} from '../../alerting/crawl-failure.js'
import { aiRedisConnection } from '../../connection.js'

describe('recordCrawlOutcome', () => {
  const domain = 'alert-test.example.com'
  let alerts: CrawlAlert[] = []

  beforeEach(() => {
    alerts = []
    setAlertEmitter((alert) => alerts.push(alert))
  })

  afterEach(async () => {
    await aiRedisConnection.del(`crawl:outcomes:${domain}`)
  })

  it('records a successful crawl without alerting', async () => {
    const result = await recordCrawlOutcome(aiRedisConnection, domain, 'success').toResult()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.alert).toBe(false)
      expect(result.value.total).toBe(1)
    }
    expect(alerts).toHaveLength(0)
  })

  it('does not alert before the minimum sample size', async () => {
    await recordCrawlOutcome(aiRedisConnection, domain, 'blocked').toResult()
    await recordCrawlOutcome(aiRedisConnection, domain, 'blocked').toResult()
    const result = await recordCrawlOutcome(aiRedisConnection, domain, 'blocked').toResult()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.alert).toBe(false)
    }
    expect(alerts).toHaveLength(0)
  })

  it('does not alert when blocked rate stays at or below the threshold', async () => {
    for (let i = 0; i < 4; i++) {
      await recordCrawlOutcome(aiRedisConnection, domain, 'success').toResult()
    }
    const result = await recordCrawlOutcome(aiRedisConnection, domain, 'blocked').toResult()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.alert).toBe(false)
      expect(result.value.rate).toBe(0.2)
    }
    expect(alerts).toHaveLength(0)
  })

  it('alerts when blocked rate exceeds the threshold over enough samples', async () => {
    for (let i = 0; i < 4; i++) {
      await recordCrawlOutcome(aiRedisConnection, domain, 'blocked').toResult()
    }
    const result = await recordCrawlOutcome(aiRedisConnection, domain, 'blocked').toResult()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.alert).toBe(true)
      expect(result.value.rate).toBeGreaterThan(0.2)
    }
    expect(alerts).toHaveLength(1)
    expect(alerts[0]?.domain).toBe(domain)
  })

  it('resets state when the Redis key is cleared', async () => {
    await recordCrawlOutcome(aiRedisConnection, domain, 'blocked').toResult()
    await recordCrawlOutcome(aiRedisConnection, domain, 'blocked').toResult()
    await aiRedisConnection.del(`crawl:outcomes:${domain}`)

    const result = await recordCrawlOutcome(aiRedisConnection, domain, 'success').toResult()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.total).toBe(1)
      expect(result.value.alert).toBe(false)
    }
  })
})
