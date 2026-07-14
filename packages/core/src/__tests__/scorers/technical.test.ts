import { describe, expect, it } from 'bun:test'
import { scoreTechnical } from '../../scorers/technical.js'
import { buildPageData } from '../fixtures/page-data.js'

describe('scoreTechnical', () => {
  it('returns a high score for a well-formed page', () => {
    const result = scoreTechnical({ pageData: buildPageData(), statusCode: 200 })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.score).toBeGreaterThan(50)
    }
  })

  it('flags missing HTTPS', () => {
    const result = scoreTechnical({
      pageData: buildPageData({ finalUrl: 'http://example.com' }),
      statusCode: 200,
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.findings.some((f) => f.code === 'TECH.NoHttps')).toBe(true)
    }
  })

  it('flags missing canonical', () => {
    const result = scoreTechnical({ pageData: buildPageData({ canonical: null }), statusCode: 200 })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.findings.some((f) => f.code === 'GEO.NoCanonical')).toBe(true)
    }
  })

  it('flags server errors', () => {
    const result = scoreTechnical({ pageData: buildPageData(), statusCode: 500 })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.findings.some((f) => f.code === 'TECH.ServerError')).toBe(true)
    }
  })
})
