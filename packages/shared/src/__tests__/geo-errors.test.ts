import { describe, expect, it } from 'bun:test'
import { ErrorType } from 'tsentials/errors'
import { GeoErr } from '../errors/geo-errors.js'

describe('GeoErr', () => {
  it('creates a crawler blocked error with the URL in the description', () => {
    const error = GeoErr.crawlerBlocked('https://example.com')
    expect(error.code).toBe('GEO.CrawlerBlocked')
    expect(error.type).toBe(ErrorType.Forbidden)
    expect(error.description).toContain('example.com')
  })

  it('creates a validation error for missing structured data', () => {
    const error = GeoErr.noStructuredData()
    expect(error.code).toBe('GEO.NoStructuredData')
    expect(error.type).toBe(ErrorType.Validation)
  })

  it('creates an unexpected error for fetch timeout', () => {
    const error = GeoErr.fetchTimeout('https://example.com')
    expect(error.type).toBe(ErrorType.Unexpected)
    expect(error.description).toContain('Unreachable')
  })
})
