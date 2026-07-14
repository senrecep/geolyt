import { describe, expect, it } from 'bun:test'
import { scoreCitability } from '../../scorers/citability.js'
import { buildPageData } from '../fixtures/page-data.js'

describe('scoreCitability', () => {
  it('returns a score between 0 and 100', () => {
    const result = scoreCitability(buildPageData())
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.score).toBeGreaterThanOrEqual(0)
      expect(result.value.score).toBeLessThanOrEqual(100)
    }
  })

  it('penalises pages with no content', () => {
    const result = scoreCitability(buildPageData({ contentBlocks: [] }))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe('GEO.NoContent')
    }
  })

  it('rewards pages with answer-ready blocks', () => {
    const result = scoreCitability(
      buildPageData({
        contentBlocks: [
          {
            id: '1',
            tag: 'h2',
            headings: [{ level: 2, text: 'Key stats' }],
            text: 'Key stats',
            wordCount: 2,
            hasStats: false,
            hasQuote: false,
          },
          {
            id: '2',
            tag: 'ul',
            headings: [{ level: 2, text: 'Key stats' }],
            text: 'Revenue grew 42%.\nCustomer satisfaction is 98%.',
            wordCount: 9,
            hasStats: true,
            hasQuote: false,
          },
        ],
      }),
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.score).toBeGreaterThan(30)
    }
  })
})
