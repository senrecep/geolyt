export const CITABILITY_WEIGHTS = {
  answerBlock: 0.3,
  selfContainment: 0.25,
  structuralReadability: 0.2,
  statisticalDensity: 0.15,
  uniqueness: 0.1,
}

export const GEO_COMPOSITE_WEIGHTS = {
  aiCitability: 0.25,
  brandAuthority: 0.2,
  contentQuality: 0.2,
  technicalFoundation: 0.15,
  structuredData: 0.1,
  platformOptimization: 0.1,
}

export function assertWeightsSumOne(weights: Record<string, number>): void {
  const total = Object.values(weights).reduce((a, b) => a + b, 0)
  if (Math.abs(total - 1) > 1e-6) {
    throw new Error(`Weights must sum to 1, got ${total}`)
  }
}

assertWeightsSumOne(CITABILITY_WEIGHTS)
assertWeightsSumOne(GEO_COMPOSITE_WEIGHTS)
