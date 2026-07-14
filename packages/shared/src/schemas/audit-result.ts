import { z } from 'zod'

export const AuditStatus = z.enum([
  'pending',
  'collecting',
  'scoring',
  'synthesizing',
  'reporting',
  'completed',
  'failed',
  'degraded',
])
export type AuditStatus = z.infer<typeof AuditStatus>

export const FindingSeverity = z.enum(['critical', 'high', 'medium', 'low', 'info'])
export type FindingSeverity = z.infer<typeof FindingSeverity>

export const Finding = z.object({
  code: z.string(),
  title: z.string(),
  description: z.string(),
  severity: FindingSeverity,
  scoreImpact: z.number().optional(),
  recommendation: z.string().optional(),
})
export type Finding = z.infer<typeof Finding>

export const CrawlerAccess = z.object({
  name: z.string(),
  tier: z.number().int().min(1).max(3),
  allowed: z.boolean(),
  reason: z.string().optional(),
})
export type CrawlerAccess = z.infer<typeof CrawlerAccess>

export const GeoScores = z.object({
  aiCitability: z.number().min(0).max(100),
  brandAuthority: z.number().min(0).max(100),
  contentQuality: z.number().min(0).max(100),
  technicalFoundation: z.number().min(0).max(100),
  structuredData: z.number().min(0).max(100),
  platformOptimization: z.number().min(0).max(100),
  composite: z.number().min(0).max(100),
})
export type GeoScores = z.infer<typeof GeoScores>

export const AuditResult = z.object({
  auditId: z.string().uuid(),
  url: z.string().url(),
  status: AuditStatus,
  scores: GeoScores,
  findings: z.array(Finding),
  crawlerAccess: z.array(CrawlerAccess),
  generatedAt: z.coerce.date(),
  reportUrl: z.string().url().optional().nullable(),
  aiSynthesisUsed: z.boolean().default(false),
})
export type AuditResult = z.infer<typeof AuditResult>
