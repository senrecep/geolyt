import { describe, expect, it } from 'bun:test'
import { scoreSchemaOrg } from '../../scorers/schema-org.js'
import { buildPageData } from '../fixtures/page-data.js'

describe('scoreSchemaOrg', () => {
  it('returns 100 for valid JSON-LD', () => {
    const result = scoreSchemaOrg(
      buildPageData({
        structuredData: [
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Example',
          },
        ],
      }),
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.score).toBe(100)
    }
  })

  it('fails when JSON-LD is missing', () => {
    const result = scoreSchemaOrg(buildPageData())
    expect(result.ok).toBe(false)
  })

  it('flags invalid context', () => {
    const result = scoreSchemaOrg(
      buildPageData({
        structuredData: [{ '@context': 'http://other.org', '@type': 'Thing' }],
      }),
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.score).toBeLessThan(100)
      expect(result.value.findings.some((f) => f.code === 'SCHEMA.InvalidContext')).toBe(true)
    }
  })
})
