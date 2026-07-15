import type { AuditResult, ScoreChange } from '@geolyt/shared'

export function calculateScoreChange(auditA: AuditResult, auditB: AuditResult): ScoreChange {
  return {
    composite: auditB.scores.composite - auditA.scores.composite,
    aiCitability: auditB.scores.aiCitability - auditA.scores.aiCitability,
    brandAuthority: auditB.scores.brandAuthority - auditA.scores.brandAuthority,
    contentQuality: auditB.scores.contentQuality - auditA.scores.contentQuality,
    technicalFoundation: auditB.scores.technicalFoundation - auditA.scores.technicalFoundation,
    structuredData: auditB.scores.structuredData - auditA.scores.structuredData,
    platformOptimization: auditB.scores.platformOptimization - auditA.scores.platformOptimization,
  }
}
