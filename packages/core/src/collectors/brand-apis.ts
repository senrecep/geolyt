import type { Finding } from '@geolyt/shared'
import type { Redis } from 'ioredis'
import { Err } from 'tsentials/errors'
import { Result } from 'tsentials/result'

export interface BrandMention {
  platform: 'wikipedia' | 'wikidata'
  title: string
  url: string
}

export interface BrandAuthorityOutput {
  score: number
  findings: Finding[]
  mentions: BrandMention[]
}

export interface ScoreBrandAuthorityOptions {
  domain: string
  redis?: Redis
  fetcher?: (url: string) => Promise<Response>
}

function cacheKey(domain: string): string {
  return `brand:${domain}`
}

async function searchWikipedia(
  term: string,
  fetcher: (url: string) => Promise<Response>,
): Promise<BrandMention[]> {
  const url = new URL('https://en.wikipedia.org/w/api.php')
  url.searchParams.set('action', 'query')
  url.searchParams.set('list', 'search')
  url.searchParams.set('srsearch', term)
  url.searchParams.set('format', 'json')
  url.searchParams.set('origin', '*')

  const response = await fetcher(url.toString())
  if (!response.ok) {
    return []
  }

  const data = (await response.json()) as { query?: { search?: Array<{ title: string }> } }
  const items = data.query?.search ?? []

  return items.slice(0, 3).map((item) => ({
    platform: 'wikipedia',
    title: item.title,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
  }))
}

async function searchWikidata(
  term: string,
  fetcher: (url: string) => Promise<Response>,
): Promise<BrandMention[]> {
  const url = new URL('https://www.wikidata.org/w/api.php')
  url.searchParams.set('action', 'wbsearchentities')
  url.searchParams.set('search', term)
  url.searchParams.set('format', 'json')
  url.searchParams.set('language', 'en')
  url.searchParams.set('origin', '*')

  const response = await fetcher(url.toString())
  if (!response.ok) {
    return []
  }

  const data = (await response.json()) as { search?: Array<{ id: string; label: string }> }
  const items = data.search ?? []

  return items.slice(0, 3).map((item) => ({
    platform: 'wikidata',
    title: item.label,
    url: `https://www.wikidata.org/wiki/${item.id}`,
  }))
}

function brandNameFromDomain(domain: string): string {
  return (
    domain
      .replace(/^www\./, '')
      .split('.')[0]
      ?.replace(/-/g, ' ') ?? domain
  )
}

function computeScore(mentions: BrandMention[]): number {
  const hasWikipedia = mentions.some((m) => m.platform === 'wikipedia')
  const hasWikidata = mentions.some((m) => m.platform === 'wikidata')

  if (hasWikipedia && hasWikidata) return 80
  if (hasWikipedia) return 55
  if (hasWikidata) return 35
  return 10
}

export async function scoreBrandAuthority(
  options: ScoreBrandAuthorityOptions,
): Promise<Result<BrandAuthorityOutput>> {
  const { domain, redis, fetcher = fetch } = options
  const cache = cacheKey(domain)

  if (redis) {
    const cached = await redis.get(cache)
    if (cached) {
      try {
        return Result.success(JSON.parse(cached) as BrandAuthorityOutput)
      } catch {
        // ignore corrupt cache and continue
      }
    }
  }

  try {
    const term = brandNameFromDomain(domain)
    const [wikipedia, wikidata] = await Promise.all([
      searchWikipedia(term, fetcher),
      searchWikidata(term, fetcher),
    ])

    const mentions = [...wikipedia, ...wikidata]
    const score = computeScore(mentions)

    const findings: Finding[] = []
    if (mentions.length === 0) {
      findings.push({
        code: 'BRAND.NoMentions',
        title: 'No Wikipedia or Wikidata presence',
        description: `No entity mentions found for ${term} on Wikipedia or Wikidata.`,
        severity: 'high',
        recommendation: 'Create or claim a Wikipedia page and a Wikidata item.',
      })
    } else {
      findings.push({
        code: 'BRAND.MentionsFound',
        title: `Found ${mentions.length} brand mention(s)`,
        description: `Detected presence on ${mentions.map((m) => m.platform).join(', ')}.`,
        severity: 'info',
      })
    }

    const output: BrandAuthorityOutput = { score, findings, mentions }

    if (redis) {
      await redis.set(cache, JSON.stringify(output), 'EX', 60 * 60 * 24 * 7)
    }

    return Result.success(output)
  } catch (error) {
    return Result.failure(
      Err.unexpected(
        'BRAND.FetchFailed',
        error instanceof Error ? error.message : 'Brand mention lookup failed',
      ),
    )
  }
}
