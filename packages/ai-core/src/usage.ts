import type { AiUsage } from '@geolyt/shared'

interface ModelPricing {
  inputPerMillion: number
  cachedInputPerMillion: number
  outputPerMillion: number
}

// Gemini 2.5 Flash-Lite published rate; also the fallback for callers that
// don't pass a model (keeps estimateCost(usage) backward compatible).
const FLASH_LITE_PRICING: ModelPricing = {
  inputPerMillion: 0.075,
  cachedInputPerMillion: 0.01875,
  outputPerMillion: 0.3,
}

// Gemini 2.5 Flash published rate.
const FLASH_PRICING: ModelPricing = {
  inputPerMillion: 0.3,
  cachedInputPerMillion: 0.075,
  outputPerMillion: 2.5,
}

// Gemini 2.5 Pro published rate (<=200k context tier).
const PRO_PRICING: ModelPricing = {
  inputPerMillion: 1.25,
  cachedInputPerMillion: 0.3125,
  outputPerMillion: 10,
}

// Claude Haiku 4.5 published rate; cached-read is 10% of input per Anthropic's pricing.
const CLAUDE_HAIKU_PRICING: ModelPricing = {
  inputPerMillion: 1,
  cachedInputPerMillion: 0.1,
  outputPerMillion: 5,
}

// gemini-3.x rows are not yet on Google's public pricing page at write time;
// they inherit their 2.5-tier sibling's rate until published rates land.
const PRICING_BY_MODEL: Record<string, ModelPricing> = {
  'gemini-2.5-flash-lite': FLASH_LITE_PRICING,
  'gemini-3.1-flash-lite': FLASH_LITE_PRICING,
  'gemini-2.5-flash': FLASH_PRICING,
  'gemini-3.5-flash': FLASH_PRICING,
  'gemini-2.5-pro': PRO_PRICING,
  'gemini-3.1-pro-preview': PRO_PRICING,
  'claude-haiku-4-5': CLAUDE_HAIKU_PRICING,
}

function pricingFor(model: string | undefined): ModelPricing {
  if (model === undefined) {
    return FLASH_LITE_PRICING
  }
  return PRICING_BY_MODEL[model] ?? FLASH_LITE_PRICING
}

export function estimateCost(usage: AiUsage, model?: string): number {
  const pricing = pricingFor(model)
  const uncachedPromptTokens = Math.max(0, usage.promptTokens - usage.cachedPromptTokens)
  const promptCost = (uncachedPromptTokens / 1_000_000) * pricing.inputPerMillion
  const cachedCost = (usage.cachedPromptTokens / 1_000_000) * pricing.cachedInputPerMillion
  const outputCost = (usage.completionTokens / 1_000_000) * pricing.outputPerMillion
  return promptCost + cachedCost + outputCost
}

/**
 * Extracts the real cached-token count from a Gemini `generateObject` response.
 *
 * The installed @ai-sdk/google provider (1.2.x) parses the API response through
 * a zod schema that only keeps `promptTokenCount`/`candidatesTokenCount` — it
 * silently strips `usageMetadata.cachedContentTokenCount`, and doesn't forward
 * it via `providerMetadata.google` either. The AI SDK still exposes the raw,
 * unstripped JSON body via `result.response.body`, so implicit-cache token
 * counts have to be read from there instead.
 */
export function extractCachedPromptTokens(responseBody: unknown): number {
  if (typeof responseBody !== 'object' || responseBody === null) {
    return 0
  }
  const usageMetadata = (responseBody as Record<string, unknown>).usageMetadata
  if (typeof usageMetadata !== 'object' || usageMetadata === null) {
    return 0
  }
  const cachedContentTokenCount = (usageMetadata as Record<string, unknown>).cachedContentTokenCount
  return typeof cachedContentTokenCount === 'number' ? cachedContentTokenCount : 0
}

export function calculateCacheHitRate(usage: AiUsage): number {
  if (usage.promptTokens === 0) {
    return 0
  }
  return usage.cachedPromptTokens / usage.promptTokens
}
