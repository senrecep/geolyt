import type { Finding, PageData, ScoreResult } from '@geolyt/shared'
import { Result } from 'tsentials/result'
import {
  type ScorerOutput,
  computeCompositeScore,
  scoreCitability,
  scoreLlmsTxt,
  scoreRobotsAccess,
  scoreSchemaOrg,
  scoreTechnical,
} from './scorers/index.js'

function addFindings(result: Result<ScorerOutput>, findings: Finding[]): void {
  if (result.ok) {
    findings.push(...result.value.findings)
  }
}

export function scoreAll(pageData: PageData): Result<ScoreResult> {
  const citability = scoreCitability(pageData)
  const robots = pageData.robots ? scoreRobotsAccess(pageData.robots) : null
  const technical = scoreTechnical({ pageData, statusCode: 200 })
  const schema = pageData.structuredData.length > 0 ? scoreSchemaOrg(pageData) : null
  const llms = pageData.llmsTxt ? scoreLlmsTxt(pageData.llmsTxt) : null

  const findings: Finding[] = []
  addFindings(citability, findings)
  if (robots) addFindings(robots, findings)
  addFindings(technical, findings)
  if (schema) addFindings(schema, findings)
  if (llms) addFindings(llms, findings)

  return Result.map(
    computeCompositeScore({
      aiCitability: citability.ok ? citability.value.score : 0,
      technicalFoundation: technical.ok ? technical.value.score : 0,
      structuredData: schema?.ok ? schema.value.score : 0,
      platformOptimization: Math.round(
        ((robots?.ok ? robots.value.score : 0) + (llms?.ok ? llms.value.score : 0)) / 2,
      ),
    }),
    (scores) => ({
      scores,
      findings,
      crawlerAccess: robots?.ok ? robots.value.access : [],
    }),
  )
}
