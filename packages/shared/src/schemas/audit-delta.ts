import { z } from 'zod'

export const ScoreChange = z.object({
  composite: z.number(),
  aiCitability: z.number(),
  brandAuthority: z.number(),
  contentQuality: z.number(),
  technicalFoundation: z.number(),
  structuredData: z.number(),
  platformOptimization: z.number(),
})

export type ScoreChange = z.infer<typeof ScoreChange>

export const AuditDelta = z.object({
  id: z.string().uuid(),
  siteId: z.string().uuid(),
  auditAId: z.string().uuid(),
  auditBId: z.string().uuid(),
  scoreChange: ScoreChange,
  createdAt: z.coerce.date(),
})

export type AuditDelta = z.infer<typeof AuditDelta>
