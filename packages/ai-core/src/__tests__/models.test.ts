import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { narrativeModels, scoringModels } from '../models.js'

describe('models', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env.GOOGLE_AI_API_KEY = 'test-google-key'
    process.env.ANTHROPIC_API_KEY = undefined
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('scoringModels returns primary and fallback google models', () => {
    const models = scoringModels()
    expect(models.length).toBe(2)
    expect(models[0]?.modelId).toContain('gemini')
  })

  it('narrativeModels returns google models when anthropic key is absent', () => {
    const models = narrativeModels()
    expect(models.length).toBe(3)
    expect(models.every((m) => m.modelId.includes('gemini'))).toBe(true)
  })

  it('narrativeModels appends anthropic model when key is present', () => {
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
    const models = narrativeModels()
    expect(models.length).toBe(4)
    expect(models[models.length - 1]?.modelId).toContain('claude')
  })

  it('throws when google api key is missing', () => {
    process.env.GOOGLE_AI_API_KEY = undefined
    expect(() => scoringModels()).toThrow('GOOGLE_AI_API_KEY is not set')
  })
})
