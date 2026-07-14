import { GEO_COMPOSITE_WEIGHTS, type GeoScores } from '@geolyt/shared'
import { Result } from 'tsentials/result'

export type CompositeInput = {
  aiCitability: number
  brandAuthority?: number
  contentQuality?: number
  technicalFoundation: number
  structuredData: number
  platformOptimization: number
}

export function computeCompositeScore(input: CompositeInput): Result<GeoScores> {
  const scores: GeoScores = {
    aiCitability: input.aiCitability,
    brandAuthority: input.brandAuthority ?? 0,
    contentQuality: input.contentQuality ?? 0,
    technicalFoundation: input.technicalFoundation,
    structuredData: input.structuredData,
    platformOptimization: input.platformOptimization,
    composite: 0,
  }

  const composite =
    scores.aiCitability * GEO_COMPOSITE_WEIGHTS.aiCitability +
    scores.brandAuthority * GEO_COMPOSITE_WEIGHTS.brandAuthority +
    scores.contentQuality * GEO_COMPOSITE_WEIGHTS.contentQuality +
    scores.technicalFoundation * GEO_COMPOSITE_WEIGHTS.technicalFoundation +
    scores.structuredData * GEO_COMPOSITE_WEIGHTS.structuredData +
    scores.platformOptimization * GEO_COMPOSITE_WEIGHTS.platformOptimization

  return Result.success({ ...scores, composite: Math.round(composite) })
}
