import { describe, expect, it } from 'bun:test'
import { GeoErr, type PageData } from '@geolyt/shared'
import { Result } from 'tsentials/result'
import { resolveCollectOutcome } from '../workers/degraded.js'

const url = 'https://blocked.example.com'

function stubPageData(): PageData {
  return {
    url,
    finalUrl: url,
    html: '<html><body><p>hello world content</p></body></html>',
    title: 'Example',
    metaDescription: null,
    canonical: null,
    headings: [],
    contentBlocks: [],
    structuredData: [],
    robots: null,
    llmsTxt: null,
    headers: {},
    contentInRawHtml: true,
    collectedAt: new Date(),
  }
}

describe('resolveCollectOutcome', () => {
  it('wraps a successful collect in a CollectResult carrying the page data', () => {
    const pageData = stubPageData()
    const outcome = resolveCollectOutcome(Result.success(pageData))

    expect(outcome.status).toBe('success')
    if (outcome.status === 'error') throw new Error('unexpected error outcome')
    expect(outcome.value.pageData).toBe(pageData)
    expect(outcome.value.blockedCrawlers).toEqual([])
    expect(outcome.value.errors).toEqual([])
  })

  it('continues in a degraded state (no throw) when the origin blocks AI crawlers', () => {
    const outcome = resolveCollectOutcome(Result.failure(GeoErr.crawlerBlocked(url)))

    expect(outcome.status).toBe('blocked')
    if (outcome.status === 'error') throw new Error('unexpected error outcome')
    expect(outcome.value.pageData).toBeNull()
    expect(outcome.value.errors).toContain('GEO.CrawlerBlocked')
    expect(outcome.value.blockedCrawlers).toContain('GPTBot')
  })

  it('stays fail-fast for non-block collection errors', () => {
    const outcome = resolveCollectOutcome(Result.failure(GeoErr.fetchTimeout(url)))

    expect(outcome.status).toBe('error')
    if (outcome.status !== 'error') throw new Error('expected error outcome')
    expect(outcome.codes).toContain('GEO.FetchTimeout')
    expect(outcome.message).toContain('GEO.FetchTimeout')
  })
})
