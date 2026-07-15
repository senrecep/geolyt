import type { AiUsage } from '@geolyt/shared'

// Gemini 2.5 Flash Lite pricing used as the default cost model.
const INPUT_PRICE_PER_1M = 0.075
const CACHED_INPUT_PRICE_PER_1M = 0.01875
const OUTPUT_PRICE_PER_1M = 0.3

export function estimateCost(usage: AiUsage): number {
  const uncachedPromptTokens = Math.max(0, usage.promptTokens - usage.cachedPromptTokens)
  const promptCost = (uncachedPromptTokens / 1_000_000) * INPUT_PRICE_PER_1M
  const cachedCost = (usage.cachedPromptTokens / 1_000_000) * CACHED_INPUT_PRICE_PER_1M
  const outputCost = (usage.completionTokens / 1_000_000) * OUTPUT_PRICE_PER_1M
  return promptCost + cachedCost + outputCost
}

export function calculateCacheHitRate(usage: AiUsage): number {
  if (usage.promptTokens === 0) {
    return 0
  }
  return usage.cachedPromptTokens / usage.promptTokens
}
