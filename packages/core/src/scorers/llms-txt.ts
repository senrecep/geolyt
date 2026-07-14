import { type Finding, GeoErr } from '@geolyt/shared'
import { Result } from 'tsentials/result'
import type { ScorerOutput } from './types.js'

function looksLikeValidLlmsTxt(content: string): boolean {
  const lines = content.split('\n').filter((line) => line.trim().length > 0)
  const hasHeader = lines[0]?.startsWith('# ') ?? false
  const hasLinks = lines.some(
    (line) => line.includes('http') || line.startsWith('- ') || line.startsWith('> '),
  )
  return hasHeader && hasLinks
}

export function scoreLlmsTxt(llmsTxt: string | null): Result<ScorerOutput> {
  if (llmsTxt === null || llmsTxt.trim().length === 0) {
    return Result.failure(GeoErr.noLlmsTxt())
  }

  const valid = looksLikeValidLlmsTxt(llmsTxt)
  const score = valid ? 100 : 50

  const findings: Finding[] = []
  if (!valid) {
    findings.push({
      code: 'LLMS.Format',
      title: 'llms.txt exists but format is weak',
      description:
        'The llms.txt file is present but does not follow the expected markdown structure.',
      severity: 'low',
      recommendation: 'Use a top-level heading and a list of links or quotes describing the site.',
    })
  }

  return Result.success({ score, findings })
}
