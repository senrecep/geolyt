import type { LanguageModel } from 'ai'

export interface RedisLike {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ...args: (string | number)[]): Promise<unknown>
}

export interface ModelChainOptions {
  redis?: RedisLike
  windowMs?: number
  maxFailures?: number
}

interface HealthRecord {
  failures: number
  lastFailureAt: number
}

function healthKey(modelId: string): string {
  return `ai:health:${modelId}`
}

export class ModelChain {
  private readonly models: LanguageModel[]
  private readonly redis: RedisLike | undefined
  private readonly windowMs: number
  private readonly maxFailures: number

  constructor(models: LanguageModel[], options: ModelChainOptions = {}) {
    this.models = models
    this.redis = options.redis
    this.windowMs = options.windowMs ?? 300_000
    this.maxFailures = options.maxFailures ?? 3
  }

  async pickModel(excludedIds?: string[]): Promise<LanguageModel | null> {
    const excluded = new Set(excludedIds ?? [])

    for (const model of this.models) {
      if (excluded.has(model.modelId)) {
        continue
      }

      const healthy = await this.isHealthy(model.modelId)
      if (healthy) {
        return model
      }
    }

    return null
  }

  async recordFailure(modelId: string): Promise<void> {
    if (!this.redis) {
      return
    }

    const key = healthKey(modelId)
    const existing = await this.redis.get(key)
    const record: HealthRecord =
      existing === null
        ? { failures: 1, lastFailureAt: Date.now() }
        : {
            failures: (JSON.parse(existing) as HealthRecord).failures + 1,
            lastFailureAt: Date.now(),
          }

    await this.redis.set(key, JSON.stringify(record), 'PX', this.windowMs)
  }

  private async isHealthy(modelId: string): Promise<boolean> {
    if (!this.redis) {
      return true
    }

    const raw = await this.redis.get(healthKey(modelId))
    if (raw === null) {
      return true
    }

    const record = JSON.parse(raw) as HealthRecord
    const expired = Date.now() - record.lastFailureAt > this.windowMs
    if (expired) {
      return true
    }

    return record.failures < this.maxFailures
  }
}
