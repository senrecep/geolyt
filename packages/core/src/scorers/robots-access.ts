import {
  AI_CRAWLERS,
  CRAWLER_TIER_WEIGHTS,
  type CrawlerAccess,
  type Finding,
  GeoErr,
} from '@geolyt/shared'
import { Result } from 'tsentials/result'
import type { ScorerOutput } from './types.js'

type RobotsRule = {
  userAgents: string[]
  disallows: string[]
  allows: string[]
}

function parseRobotsTxt(content: string): RobotsRule[] {
  const rules: RobotsRule[] = []
  let current: RobotsRule | null = null

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (line.length === 0 || line.startsWith('#')) continue

    const separatorIndex = line.indexOf(':')
    if (separatorIndex === -1) continue

    const key = line.slice(0, separatorIndex).trim().toLowerCase()
    const value = line.slice(separatorIndex + 1).trim()

    if (key === 'user-agent') {
      if (current) {
        rules.push(current)
      }
      current = { userAgents: [value.toLowerCase()], disallows: [], allows: [] }
    } else if (current && key === 'disallow') {
      current.disallows.push(value)
    } else if (current && key === 'allow') {
      current.allows.push(value)
    }
  }

  if (current) {
    rules.push(current)
  }

  return rules
}

function ruleAppliesToAgent(rule: RobotsRule, agentName: string): boolean {
  const normalized = agentName.toLowerCase()
  return rule.userAgents.includes('*') || rule.userAgents.includes(normalized)
}

function isDisallowed(rules: RobotsRule[], agentName: string): boolean {
  const normalized = agentName.toLowerCase()

  for (const rule of rules) {
    if (!ruleAppliesToAgent(rule, normalized)) continue
    if (rule.disallows.some((d) => d === '/')) return true
  }

  return false
}

export function scoreRobotsAccess(robotsTxt: string | null): Result<ScorerOutput> {
  if (robotsTxt === null || robotsTxt.trim().length === 0) {
    return Result.failure(GeoErr.noContent())
  }

  const rules = parseRobotsTxt(robotsTxt)
  const access: CrawlerAccess[] = []
  let score = 0

  const tierCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0 }
  for (const crawler of AI_CRAWLERS) {
    tierCounts[crawler.tier] = (tierCounts[crawler.tier] ?? 0) + 1
  }

  for (const crawler of AI_CRAWLERS) {
    const blocked = isDisallowed(rules, crawler.name)
    const allowed = !blocked
    const weight = CRAWLER_TIER_WEIGHTS[crawler.tier] / (tierCounts[crawler.tier] ?? 1)

    if (allowed) {
      score += weight * 100
    }

    access.push({
      name: crawler.name,
      tier: crawler.tier,
      allowed,
      reason: blocked ? 'Disallow: / in robots.txt' : undefined,
    })
  }

  const findings: Finding[] = []
  if (score < 100) {
    const blocked = access.filter((a) => !a.allowed).map((a) => a.name)
    findings.push({
      code: 'ROBOTS.CrawlerBlocked',
      title: 'Some AI crawlers are blocked',
      description: `The following AI crawlers are disallowed: ${blocked.join(', ')}.`,
      severity: 'medium',
      recommendation:
        'Review robots.txt and only block crawlers you intentionally want to exclude.',
    })
  }

  return Result.success({ score: Math.round(score), findings })
}
