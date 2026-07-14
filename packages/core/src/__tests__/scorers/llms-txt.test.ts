import { describe, expect, it } from 'bun:test'
import { scoreLlmsTxt } from '../../scorers/llms-txt.js'

describe('scoreLlmsTxt', () => {
  it('returns 100 for a well-formatted llms.txt', () => {
    const content =
      '# Example site\n\n- Docs: https://example.com/docs\n- API: https://example.com/api'
    const result = scoreLlmsTxt(content)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.score).toBe(100)
    }
  })

  it('returns 50 for a malformed llms.txt', () => {
    const result = scoreLlmsTxt('just some random text')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.score).toBe(50)
    }
  })

  it('fails when llms.txt is missing', () => {
    const result = scoreLlmsTxt(null)
    expect(result.ok).toBe(false)
  })
})
