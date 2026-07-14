import { GeoErr } from '@geolyt/shared'
import { ResultAsync } from 'tsentials/result'

export type FetchedHtml = {
  url: string
  finalUrl: string
  html: string
  headers: Record<string, string>
  statusCode: number
}

const DEFAULT_TIMEOUT_MS = 15_000
const MAX_REDIRECTS = 5

function normalizeHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {}
  headers.forEach((value, key) => {
    result[key.toLowerCase()] = value
  })
  return result
}

type FetchResult = {
  response: Response
  finalUrl: string
}

async function fetchWithRedirects(url: string, remainingRedirects: number): Promise<FetchResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'GeolytBot/1.0 (+https://geolyt.io/bot)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'manual',
    })

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location) {
        return { response, finalUrl: url }
      }
      if (remainingRedirects <= 0) {
        throw new Error('Too many redirects')
      }
      const nextUrl = new URL(location, url).toString()
      return fetchWithRedirects(nextUrl, remainingRedirects - 1)
    }

    return { response, finalUrl: url }
  } finally {
    clearTimeout(timeout)
  }
}

export function fetchHtml(url: string): ResultAsync<FetchedHtml> {
  return ResultAsync.try(
    async () => {
      const { response, finalUrl } = await fetchWithRedirects(url, MAX_REDIRECTS)
      const html = await response.text()

      return {
        url,
        finalUrl,
        html,
        headers: normalizeHeaders(response.headers),
        statusCode: response.status,
      }
    },
    () => GeoErr.fetchTimeout(url),
  )
}
