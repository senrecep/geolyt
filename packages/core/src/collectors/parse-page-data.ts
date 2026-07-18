import { GeoErr, type PageData } from '@geolyt/shared'
import * as cheerio from 'cheerio'
import { Result } from 'tsentials/result'
import type { FetchedHtml } from './fetch-html.js'
import { segmentBlocks } from './segment-blocks.js'

function parseStructuredData($: cheerio.CheerioAPI): Record<string, unknown>[] {
  const data: Record<string, unknown>[] = []

  $('script[type="application/ld+json"]').each((_, element) => {
    const raw = $(element).html()
    if (!raw) return
    const parsed = Result.try(() => JSON.parse(raw) as Record<string, unknown>)
    if (parsed.ok) {
      data.push(parsed.value)
    }
    // Skip malformed JSON-LD blocks.
  })

  return data
}

function parseHeadings($: cheerio.CheerioAPI): { level: 1 | 2 | 3 | 4 | 5 | 6; text: string }[] {
  const headings: { level: 1 | 2 | 3 | 4 | 5 | 6; text: string }[] = []

  $('h1, h2, h3, h4, h5, h6').each((_, element) => {
    const tag = element.tagName.toLowerCase()
    const level = Number(tag[1]) as 1 | 2 | 3 | 4 | 5 | 6
    const text = $(element).text().trim()
    if (text.length > 0) {
      headings.push({ level, text })
    }
  })

  return headings
}

export function parsePageData(
  result: FetchedHtml,
  robots: string | null,
  llmsTxt: string | null,
): Result<PageData> {
  const $ = cheerio.load(result.html)

  const title = $('title').first().text().trim()
  if (title.length === 0 && result.statusCode !== 404) {
    return Result.failure(GeoErr.noContent())
  }

  const metaDescription = $('meta[name="description"]').attr('content') || null
  const canonicalHref = $('link[rel="canonical"]').attr('href')
  const canonical = canonicalHref ? new URL(canonicalHref, result.finalUrl).toString() : null

  const contentBlocks = segmentBlocks(result.html)
  const totalWords = contentBlocks.reduce((sum, block) => sum + block.wordCount, 0)
  if (totalWords === 0 && result.statusCode !== 404) {
    return Result.failure(GeoErr.jsRenderedOnly())
  }

  return Result.success({
    url: result.url,
    finalUrl: result.finalUrl,
    html: result.html,
    title,
    metaDescription,
    canonical,
    headings: parseHeadings($),
    contentBlocks,
    structuredData: parseStructuredData($),
    robots,
    llmsTxt,
    headers: result.headers,
    contentInRawHtml: true,
    collectedAt: new Date(),
  })
}
