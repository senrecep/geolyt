import { describe, expect, it } from 'bun:test'
import { isPrivateUrl, validateTargetUrl } from '../../utils/url.js'

describe('isPrivateUrl', () => {
  it('blocks localhost', () => {
    expect(isPrivateUrl('http://localhost:3000/page')).toBe(true)
  })

  it('blocks 127.0.0.1', () => {
    expect(isPrivateUrl('http://127.0.0.1/')).toBe(true)
  })

  it('blocks 10.x private range', () => {
    expect(isPrivateUrl('http://10.0.0.1/')).toBe(true)
  })

  it('blocks 172.16-31 private range', () => {
    expect(isPrivateUrl('http://172.20.5.1/')).toBe(true)
  })

  it('blocks 192.168 private range', () => {
    expect(isPrivateUrl('http://192.168.1.1/')).toBe(true)
  })

  it('allows public URLs', () => {
    expect(isPrivateUrl('https://example.com/')).toBe(false)
  })

  it('treats malformed URLs as private', () => {
    expect(isPrivateUrl('not a url')).toBe(true)
  })
})

describe('validateTargetUrl', () => {
  it('returns success for a public https URL', () => {
    const result = validateTargetUrl('https://example.com')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toBe('https://example.com')
    }
  })

  it('returns failure for a private URL', () => {
    const result = validateTargetUrl('http://192.168.1.1')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe('GEO.CrawlerBlocked')
    }
  })

  it('returns failure for a non-http protocol', () => {
    const result = validateTargetUrl('ftp://example.com')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe('GEO.InvalidUrl')
    }
  })
})
