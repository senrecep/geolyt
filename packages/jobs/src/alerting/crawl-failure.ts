import { logger } from '@geolyt/shared/logger'
import type { Redis } from 'ioredis'
import { Err } from 'tsentials/errors'
import { Result, ResultAsync } from 'tsentials/result'

export type CrawlOutcome = 'success' | 'blocked' | 'error'

export interface CrawlAlert {
  domain: string
  blocked: number
  total: number
  rate: number
  alert: boolean
}

const OUTCOME_WINDOW = 20
const BLOCKED_THRESHOLD = 0.2
const MIN_SAMPLES_BEFORE_ALERT = 5
const KEY_TTL_SECONDS = 3600

export type AlertEmitter = (alert: CrawlAlert) => void

let alertEmitter: AlertEmitter = (alert) => {
  logger.warn(
    alert,
    `[crawl-alert] ${alert.domain}: ${alert.blocked}/${alert.total} blocked (${Math.round(alert.rate * 100)}%)`,
  )
}

export function setAlertEmitter(emitter: AlertEmitter): void {
  alertEmitter = emitter
}

function outcomeKey(domain: string): string {
  return `crawl:outcomes:${domain}`
}

export function recordCrawlOutcome(
  redis: Redis,
  domain: string,
  outcome: CrawlOutcome,
): ResultAsync<CrawlAlert> {
  const key = outcomeKey(domain)

  return ResultAsync.try(
    async () => {
      await redis.lpush(key, outcome)
      await redis.ltrim(key, 0, OUTCOME_WINDOW - 1)
      await redis.expire(key, KEY_TTL_SECONDS)
      const stored = await redis.lrange(key, 0, OUTCOME_WINDOW - 1)
      return stored as CrawlOutcome[]
    },
    (error) => Err.unexpected('Alerting.RecordOutcome', `Failed to record crawl outcome: ${error}`),
  ).andThen((outcomes) => evaluateAndEmit(domain, outcomes))
}

function evaluateAndEmit(domain: string, outcomes: CrawlOutcome[]): Result<CrawlAlert> {
  const total = outcomes.length
  const blocked = outcomes.filter((outcome) => outcome === 'blocked').length
  const rate = total === 0 ? 0 : blocked / total
  const alert = total >= MIN_SAMPLES_BEFORE_ALERT && rate > BLOCKED_THRESHOLD

  const status: CrawlAlert = { domain, blocked, total, rate, alert }

  if (alert) {
    alertEmitter(status)
  }

  return Result.success(status)
}
