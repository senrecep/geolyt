import { describe, expect, it } from 'bun:test'
import { buildCrawlerBlockedScore } from '../workers/degraded.js'

describe('buildCrawlerBlockedScore', () => {
  const url = 'https://blocked.example.com'

  it('produces an all-zero, degraded score result with no crawler access', () => {
    const result = buildCrawlerBlockedScore(url)

    expect(result.degraded).toBe(true)
    expect(result.crawlerAccess).toEqual([])
    expect(result.scores).toEqual({
      aiCitability: 0,
      brandAuthority: 0,
      contentQuality: 0,
      technicalFoundation: 0,
      structuredData: 0,
      platformOptimization: 0,
      composite: 0,
    })
  })

  it('emits a single critical CrawlerBlocked finding referencing the url', () => {
    const result = buildCrawlerBlockedScore(url)

    expect(result.findings).toHaveLength(1)
    const [finding] = result.findings
    expect(finding?.code).toBe('GEO.CrawlerBlocked')
    expect(finding?.severity).toBe('critical')
    expect(finding?.description).toContain(url)
    expect(finding?.recommendation).toBeDefined()
  })
})
