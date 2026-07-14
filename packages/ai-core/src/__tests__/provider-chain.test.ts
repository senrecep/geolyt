import { describe, expect, it } from 'bun:test'
import type { LanguageModel } from 'ai'
import type { Redis } from 'ioredis'
import { ModelChain } from '../provider-chain.js'

class FakeRedis {
  store = new Map<string, string>()

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null
  }

  async set(key: string, value: string): Promise<void> {
    this.store.set(key, value)
  }
}

function fakeModel(id: string): LanguageModel {
  return { modelId: id, specification: () => ({}) } as unknown as LanguageModel
}

describe('ModelChain', () => {
  const models = [
    fakeModel('gemini-primary'),
    fakeModel('gemini-fallback'),
    fakeModel('claude-last'),
  ]

  it('picks the first model when redis is unavailable', async () => {
    const chain = new ModelChain(models)
    const picked = await chain.pickModel()
    expect(picked?.modelId).toBe('gemini-primary')
  })

  it('skips a model that has recent failures in redis', async () => {
    const redis = new FakeRedis() as unknown as Redis
    const chain = new ModelChain(models, { redis, windowMs: 60_000, maxFailures: 2 })

    await chain.recordFailure('gemini-primary')
    await chain.recordFailure('gemini-primary')

    const picked = await chain.pickModel()
    expect(picked?.modelId).toBe('gemini-fallback')
  })

  it('returns null when every model is unhealthy', async () => {
    const redis = new FakeRedis() as unknown as Redis
    const chain = new ModelChain(models, { redis, windowMs: 60_000, maxFailures: 1 })

    for (const model of models) {
      await chain.recordFailure(model.modelId)
    }

    const picked = await chain.pickModel()
    expect(picked).toBeNull()
  })

  it('resumes using a model after its failure window passes', async () => {
    const redis = new FakeRedis() as unknown as Redis
    const chain = new ModelChain(models, { redis, windowMs: 1, maxFailures: 1 })

    await chain.recordFailure('gemini-primary')
    await new Promise((resolve) => setTimeout(resolve, 10))

    const picked = await chain.pickModel()
    expect(picked?.modelId).toBe('gemini-primary')
  })
})
