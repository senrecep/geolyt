import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { JSONValue, LanguageModel } from 'ai'

function googleApiKey(): string | undefined {
  return process.env.GOOGLE_AI_API_KEY
}

function anthropicApiKey(): string | undefined {
  return process.env.ANTHROPIC_API_KEY
}

export function createGoogleProvider() {
  const apiKey = googleApiKey()
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY is not set')
  }
  return createGoogleGenerativeAI({ apiKey })
}

export function createAnthropicProvider() {
  const apiKey = anthropicApiKey()
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set')
  }
  return createAnthropic({ apiKey })
}

export function scoringModels(): LanguageModel[] {
  const google = createGoogleProvider()
  return [google('gemini-3.1-flash-lite'), google('gemini-2.5-flash-lite')]
}

export function narrativeModels(): LanguageModel[] {
  const google = createGoogleProvider()
  const models: LanguageModel[] = [
    google('gemini-3.5-flash'),
    google('gemini-3.1-pro-preview'),
    google('gemini-2.5-pro'),
  ]

  const anthropicApiKey = process.env.ANTHROPIC_API_KEY
  if (anthropicApiKey) {
    models.push(createAnthropic({ apiKey: anthropicApiKey })('claude-haiku-4-5'))
  }

  return models
}

export type ThinkingTier = 'minimal' | 'low'

// The installed @ai-sdk/google provider (1.2.x) only forwards
// `thinkingConfig.thinkingBudget` to the API — the newer `thinkingLevel`
// enum (Gemini 3's minimal/low/high) isn't in its request schema and would
// be silently dropped by zod during provider-options parsing. Map our
// tiers to token budgets instead until the SDK is upgraded to a version
// that supports thinkingLevel directly.
const THINKING_BUDGET_BY_TIER: Record<ThinkingTier, number> = {
  minimal: 128,
  low: 1024,
}

export function thinkingTierForModel(modelId: string): ThinkingTier {
  return modelId.toLowerCase().includes('flash') ? 'minimal' : 'low'
}

export function thinkingProviderOptions(
  tier: ThinkingTier,
): Record<string, Record<string, JSONValue>> {
  return {
    google: {
      thinkingConfig: { thinkingBudget: THINKING_BUDGET_BY_TIER[tier] },
    },
  }
}
