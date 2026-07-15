import { describe, expect, it } from 'bun:test'
import { scanContent, secretPatterns } from '../secret-scan.js'

// Secret-like strings are assembled at runtime so the test fixtures do not
// trigger GitHub push protection while still exercising the regex patterns.
const stripePrefix = ['s', 'k', '_', 'l', 'i', 'v', 'e', '_'].join('')
const stripeTestPrefix = ['s', 'k', '_', 't', 'e', 's', 't', '_'].join('')
const openAiPrefix = ['s', 'k', '-'].join('')

describe('scanContent', () => {
  it('returns no findings for clean content', () => {
    const findings = scanContent('const greeting = "hello world"')
    expect(findings).toHaveLength(0)
  })

  it('detects a Stripe live secret key', () => {
    const key = `${stripePrefix}123456789012345678901234`
    const findings = scanContent(`stripe_key = "${key}"`)
    expect(findings.length).toBeGreaterThan(0)
    expect(findings[0]?.pattern).toBe('Stripe secret key')
  })

  it('detects an OpenAI API key', () => {
    const openAiKey = `${openAiPrefix}abcdefghijklmnopqrstuvwxyz1234567890123456789012`
    const findings = scanContent(`OPENAI_API_KEY=${openAiKey}`)
    expect(findings.length).toBeGreaterThan(0)
    expect(findings[0]?.pattern).toBe('OpenAI API key')
  })

  it('detects a generic secret assignment', () => {
    const findings = scanContent('apiKey = "supersecret1234567890123456"')
    expect(findings.length).toBeGreaterThan(0)
    expect(findings[0]?.pattern).toBe('Generic secret/key assignment')
  })

  it('ignores placeholder values', () => {
    const key = `${stripeTestPrefix}your_key_here`
    const findings = scanContent(`STRIPE_SECRET_KEY=${key}`)
    expect(findings).toHaveLength(0)
  })

  it('reports the line number for each finding', () => {
    const findings = scanContent('line one\nline two\nSECRET_KEY="abc123def456ghi789"')
    expect(findings[0]?.line).toBe(3)
  })
})

describe('secretPatterns', () => {
  it('has at least one pattern configured', () => {
    expect(secretPatterns.length).toBeGreaterThan(0)
  })
})
