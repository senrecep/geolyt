import type { Finding } from '@geolyt/shared'
import type { Redis } from 'ioredis'
import { Err } from 'tsentials/errors'
import { Result } from 'tsentials/result'

export interface BrandMention {
  platform: 'wikipedia' | 'wikidata' | 'youtube' | 'reddit'
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
  youtubeApiKey?: string
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

async function searchYouTube(
  term: string,
  apiKey: string | undefined,
  fetcher: (url: string) => Promise<Response>,
): Promise<BrandMention[]> {
  if (!apiKey) {
    return []
  }

  const url = new URL('https://www.googleapis.com/youtube/v3/search')
  url.searchParams.set('part', 'snippet')
  url.searchParams.set('q', term)
  url.searchParams.set('type', 'video')
  url.searchParams.set('maxResults', '3')
  url.searchParams.set('key', apiKey)

  const response = await fetcher(url.toString())
  if (!response.ok) {
    return []
  }

  const data = (await response.json()) as {
    items?: Array<{ id?: { videoId?: string }; snippet?: { title?: string } }>
  }
  const items = data.items ?? []

  return items.slice(0, 3).map((item) => ({
    platform: 'youtube',
    title: item.snippet?.title ?? 'YouTube video',
    url: `https://www.youtube.com/watch?v=${item.id?.videoId ?? ''}`,
  }))
}

async function searchReddit(
  term: string,
  fetcher: (url: string) => Promise<Response>,
): Promise<BrandMention[]> {
  const url = new URL('https://www.reddit.com/search.json')
  url.searchParams.set('q', term)
  url.searchParams.set('limit', '3')

  const response = await fetcher(url.toString())
  if (!response.ok) {
    return []
  }

  const data = (await response.json()) as {
    data?: { children?: Array<{ data?: { title?: string; permalink?: string } }> }
  }
  const children = data.data?.children ?? []

  return children.slice(0, 3).map((child) => ({
    platform: 'reddit',
    title: child.data?.title ?? 'Reddit post',
    url: `https://www.reddit.com${child.data?.permalink ?? ''}`,
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
  const platforms = new Set(mentions.map((m) => m.platform))
  const hasWikipedia = platforms.has('wikipedia')
  const hasWikidata = platforms.has('wikidata')
  const hasYouTube = platforms.has('youtube')
  const hasReddit = platforms.has('reddit')

  let score = 10
  if (hasWikipedia) score += 35
  if (hasWikidata) score += 25
  if (hasYouTube) score += 15
  if (hasReddit) score += 10
  if (platforms.size >= 2) score += 15

  return Math.min(score, 100)
}

export async function scoreBrandAuthority(
  options: ScoreBrandAuthorityOptions,
): Promise<Result<BrandAuthorityOutput>> {
  const {
    domain,
    redis,
    fetcher = fetch,
    youtubeApiKey = process.env.YOUTUBE_DATA_API_KEY,
  } = options
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
    const [wikipedia, wikidata, youtube, reddit] = await Promise.all([
      searchWikipedia(term, fetcher),
      searchWikidata(term, fetcher),
      searchYouTube(term, youtubeApiKey, fetcher),
      searchReddit(term, fetcher),
    ])

    const mentions = [...wikipedia, ...wikidata, ...youtube, ...reddit]
    const score = computeScore(mentions)

    const findings: Finding[] = []
    if (mentions.length === 0) {
      findings.push({
        code: 'BRAND.NoMentions',
        title: 'No brand mentions found',
        description: `No entity mentions found for ${term} on Wikipedia, Wikidata, YouTube, or Reddit.`,
        severity: 'high',
        recommendation:
          'Create or claim a Wikipedia page, Wikidata item, YouTube channel, or Reddit presence.',
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
