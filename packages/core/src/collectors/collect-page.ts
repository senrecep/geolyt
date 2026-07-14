import { GeoErr, type PageData } from '@geolyt/shared'
import { ResultAsync } from 'tsentials/result'
import { validateTargetUrl } from '../utils/url.js'
import { collectLlmsTxt } from './collect-llmstxt.js'
import { collectRobots } from './collect-robots.js'
import { fetchHtml } from './fetch-html.js'
import { parsePageData } from './parse-page-data.js'

export type CollectPageOptions = {
  firecrawlUrl?: string
  firecrawlApiKey?: string
}

type FirecrawlResponse = {
  success: boolean
  data?: {
    html?: string
    markdown?: string
    metadata?: {
      title?: string
      description?: string
      sourceURL?: string
      statusCode?: number
    }
  }
  error?: string
}

async function callFirecrawl(
  url: string,
  firecrawlUrl: string,
  apiKey: string,
): Promise<FirecrawlResponse> {
  const response = await fetch(`${firecrawlUrl}/v1/scrape`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      url,
      formats: ['html', 'markdown'],
      onlyMainContent: true,
    }),
  })

  if (response.status === 403) {
    throw GeoErr.crawlerBlocked(url)
  }

  return (await response.json()) as FirecrawlResponse
}

function htmlFromFirecrawl(body: FirecrawlResponse): string {
  const data = body.data
  const metadata = data?.metadata ?? {}

  let html = data?.html ?? data?.markdown ?? ''
  if (!html.includes('<title>') && metadata.title) {
    html = `<title>${metadata.title}</title>\n${html}`
  }
  if (!html.includes('<meta') && metadata.description) {
    html = `<meta name="description" content="${metadata.description}">\n${html}`
  }

  return html
}

export function collectPage(url: string, options: CollectPageOptions = {}): ResultAsync<PageData> {
  return ResultAsync.fromResult(validateTargetUrl(url)).andThen((validUrl) => {
    if (options.firecrawlUrl) {
      return collectPageWithFirecrawl(
        validUrl,
        options.firecrawlUrl,
        options.firecrawlApiKey ?? 'self-hosted',
      )
    }

    return collectPagePlain(validUrl)
  })
}

function collectPagePlain(url: string): ResultAsync<PageData> {
  return fetchHtml(url).andThen((htmlResult) =>
    collectRobots(url)
      .else(null)
      .andThen((robots) =>
        collectLlmsTxt(url)
          .else(null)
          .andThen((llmsTxt) => ResultAsync.fromResult(parsePageData(htmlResult, robots, llmsTxt))),
      ),
  )
}

function collectPageWithFirecrawl(
  url: string,
  firecrawlUrl: string,
  apiKey: string,
): ResultAsync<PageData> {
  return ResultAsync.try(
    () => callFirecrawl(url, firecrawlUrl, apiKey),
    (error) => {
      const candidate = error as { code?: string }
      return candidate.code === 'GEO.CrawlerBlocked'
        ? GeoErr.crawlerBlocked(url)
        : GeoErr.fetchTimeout(url)
    },
  )
    .ensure((body) => body.success && body.data !== undefined, GeoErr.fetchTimeout(url))
    .andThen((body) => {
      const html = htmlFromFirecrawl(body)
      const metadata = body.data?.metadata ?? {}
      const htmlResult = {
        url,
        finalUrl: metadata.sourceURL ?? url,
        html,
        headers: {},
        statusCode: metadata.statusCode ?? 200,
      }

      return collectRobots(url)
        .else(null)
        .andThen((robots) =>
          collectLlmsTxt(url)
            .else(null)
            .andThen((llmsTxt) =>
              ResultAsync.fromResult(parsePageData(htmlResult, robots, llmsTxt)),
            ),
        )
    })
}
