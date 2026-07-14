import { describe, expect, it } from 'bun:test'
import { scoreRobotsAccess } from '../../scorers/robots-access.js'

describe('scoreRobotsAccess', () => {
  it('returns 100 when all AI crawlers are allowed', () => {
    const result = scoreRobotsAccess('User-agent: *\nDisallow: /admin')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.score).toBe(100)
      expect(result.value.findings).toHaveLength(0)
    }
  })

  it('returns a lower score when tier 1 crawlers are blocked', () => {
    const result = scoreRobotsAccess(
      'User-agent: GPTBot\nDisallow: /\nUser-agent: *\nDisallow: /admin',
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.score).toBeLessThan(100)
      expect(result.value.findings.length).toBeGreaterThan(0)
    }
  })

  it('fails when robots.txt is empty', () => {
    const result = scoreRobotsAccess(null)
    expect(result.ok).toBe(false)
  })
})
