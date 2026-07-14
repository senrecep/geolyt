import type { ResultAsync } from 'tsentials/result'
import { fetchHtml } from './fetch-html.js'

export function collectRobots(siteUrl: string): ResultAsync<string | null> {
  const url = new URL('/robots.txt', siteUrl).toString()

  return fetchHtml(url).map((result) => {
    if (result.statusCode === 404 || result.statusCode === 410) {
      return null
    }
    if (result.statusCode >= 400) {
      return null
    }
    return result.html
  })
}
