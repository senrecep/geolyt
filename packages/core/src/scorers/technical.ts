import { type Finding, GeoErr, type PageData } from '@geolyt/shared'
import { Err } from 'tsentials/errors'
import { Result } from 'tsentials/result'
import { RuleEngine } from 'tsentials/rules'
import type { ScorerOutput } from './types.js'

export type TechnicalInput = {
  pageData: PageData
  statusCode: number
}

const hasHttps = RuleEngine.fromPredicate<TechnicalInput>(
  (input) => input.pageData.finalUrl.startsWith('https://'),
  Err.validation('TECH.NoHttps', 'Page is not served over HTTPS'),
)

const hasTitle = RuleEngine.fromPredicate<TechnicalInput>(
  (input) => input.pageData.title.length >= 10 && input.pageData.title.length <= 70,
  Err.validation('TECH.Title', 'Title tag is missing or outside 10-70 characters'),
)

const hasMetaDescription = RuleEngine.fromPredicate<TechnicalInput>(
  (input) => {
    const description = input.pageData.metaDescription
    return (
      description !== null &&
      description !== undefined &&
      description.length >= 50 &&
      description.length <= 160
    )
  },
  Err.validation(
    'TECH.MetaDescription',
    'Meta description is missing or outside 50-160 characters',
  ),
)

const hasCanonical = RuleEngine.fromPredicate<TechnicalInput>(
  (input) => input.pageData.canonical !== null,
  GeoErr.noCanonical(),
)

const hasSsrContent = RuleEngine.fromPredicate<TechnicalInput>(
  (input) => input.pageData.contentInRawHtml && input.pageData.contentBlocks.length > 0,
  GeoErr.jsRenderedOnly(),
)

const hasNoServerError = RuleEngine.fromPredicate<TechnicalInput>(
  (input) => input.statusCode < 400,
  Err.validation('TECH.ServerError', 'Server returned an error status code'),
)

const hasSecurityHeaders = RuleEngine.fromPredicate<TechnicalInput>(
  (input) => {
    const headers = input.pageData.headers
    return (
      headers['strict-transport-security'] !== undefined ||
      headers['x-frame-options'] !== undefined ||
      headers['content-security-policy'] !== undefined
    )
  },
  Err.validation(
    'TECH.SecurityHeaders',
    'Missing basic security headers (HSTS, X-Frame-Options or CSP)',
  ),
)

const hasStructuredData = RuleEngine.fromPredicate<TechnicalInput>(
  (input) => input.pageData.structuredData.length > 0,
  GeoErr.noStructuredData(),
)

const RULES = [
  { name: 'HTTPS', rule: hasHttps },
  { name: 'Title', rule: hasTitle },
  { name: 'Meta description', rule: hasMetaDescription },
  { name: 'Canonical', rule: hasCanonical },
  { name: 'SSR content', rule: hasSsrContent },
  { name: 'No server error', rule: hasNoServerError },
  { name: 'Security headers', rule: hasSecurityHeaders },
  { name: 'Structured data', rule: hasStructuredData },
]

export function scoreTechnical(input: TechnicalInput): Result<ScorerOutput> {
  const findings: Finding[] = []
  let passed = 0

  for (const { name, rule } of RULES) {
    const result = rule(input)
    if (result.ok) {
      passed++
    } else {
      const error = result.errors[0]
      findings.push({
        code: error?.code ?? 'TECH.Unknown',
        title: name,
        description: error?.description ?? 'Rule failed',
        severity: name === 'SSR content' || name === 'Canonical' ? 'high' : 'medium',
      })
    }
  }

  if (passed === 0 && findings.length > 0) {
    return Result.failure(GeoErr.noContent())
  }

  return Result.success({
    score: Math.round((passed / RULES.length) * 100),
    findings,
  })
}
