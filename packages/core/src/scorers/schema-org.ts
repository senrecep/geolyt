import { type Finding, GeoErr, type PageData } from '@geolyt/shared'
import { Err } from 'tsentials/errors'
import { Result } from 'tsentials/result'
import { RuleEngine } from 'tsentials/rules'
import type { ScorerOutput } from './types.js'

const hasJsonLd = RuleEngine.fromPredicate<PageData>(
  (page) => page.structuredData.length > 0,
  GeoErr.noStructuredData(),
)

const hasValidContext = RuleEngine.fromPredicate<PageData>(
  (page) =>
    page.structuredData.length > 0 &&
    page.structuredData.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        (String(item['@context'] ?? '').includes('schema.org') ||
          String(item['@context'] ?? '').includes('//schema.org')),
    ),
  Err.validation('SCHEMA.InvalidContext', 'JSON-LD blocks are missing a schema.org @context'),
)

const hasType = RuleEngine.fromPredicate<PageData>(
  (page) =>
    page.structuredData.length > 0 &&
    page.structuredData.every(
      (item) => typeof item === 'object' && item !== null && '@type' in item,
    ),
  Err.validation('SCHEMA.NoType', 'JSON-LD blocks are missing a @type field'),
)

const RULES = [
  { name: 'JSON-LD present', rule: hasJsonLd },
  { name: 'schema.org context', rule: hasValidContext },
  { name: '@type present', rule: hasType },
]

export function scoreSchemaOrg(pageData: PageData): Result<ScorerOutput> {
  const findings: Finding[] = []
  let passed = 0

  for (const { name, rule } of RULES) {
    const result = rule(pageData)
    if (result.ok) {
      passed++
    } else {
      const error = result.errors[0]
      findings.push({
        code: error?.code ?? 'SCHEMA.Unknown',
        title: name,
        description: error?.description ?? 'Rule failed',
        severity: 'medium',
      })
    }
  }

  if (passed === 0 && findings.length > 0) {
    return Result.failure(GeoErr.noStructuredData())
  }

  return Result.success({
    score: Math.round((passed / RULES.length) * 100),
    findings,
  })
}
