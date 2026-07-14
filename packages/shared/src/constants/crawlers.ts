export type CrawlerTier = 1 | 2 | 3

export type CrawlerDefinition = {
  name: string
  tier: CrawlerTier
}

export const AI_CRAWLERS: readonly CrawlerDefinition[] = [
  { name: 'GPTBot', tier: 1 },
  { name: 'OAI-SearchBot', tier: 1 },
  { name: 'ClaudeBot', tier: 1 },
  { name: 'PerplexityBot', tier: 1 },
  { name: 'ChatGPT-User', tier: 1 },
  { name: 'Google-Extended', tier: 2 },
  { name: 'Applebot-Extended', tier: 2 },
  { name: 'Amazonbot', tier: 2 },
  { name: 'FacebookBot', tier: 2 },
  { name: 'Meta-ExternalAgent', tier: 2 },
  { name: 'CCBot', tier: 3 },
  { name: 'Bytespider', tier: 3 },
  { name: 'cohere-ai', tier: 3 },
  { name: 'anthropic-ai', tier: 3 },
]

export const CRAWLER_TIER_WEIGHTS: Record<CrawlerTier, number> = {
  1: 0.5,
  2: 0.25,
  3: 0.25,
}

export function crawlersInTier(tier: CrawlerTier): readonly CrawlerDefinition[] {
  return AI_CRAWLERS.filter((c) => c.tier === tier)
}
