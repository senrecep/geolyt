import { describe, expect, it } from 'bun:test'
import { PageData } from '@geolyt/shared'
import { scoreCitability } from '../../src/scorers/citability.js'
import golden from './citability-golden.json'

describe('citability parity golden fixture', () => {
  it('produces a score within 5 points of the golden reference', () => {
    const pageData = PageData.parse(golden.pageData)
    const result = scoreCitability(pageData)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(Math.abs(result.value.score - golden.expectedScore)).toBeLessThanOrEqual(5)
    }
  })
})
