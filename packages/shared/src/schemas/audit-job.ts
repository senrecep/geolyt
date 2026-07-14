import { z } from 'zod'
import { CrawlerAccess, Finding, GeoScores } from './audit-result.js'
import { PageData } from './page-data.js'

export const AuditJobInput = z.object({
  url: z.string().url(),
  siteId: z.string().uuid().optional(),
  reportFormat: z.enum(['json', 'markdown', 'pdf']).default('pdf'),
})
export type AuditJobInput = z.infer<typeof AuditJobInput>

export const CollectResult = z.object({
  pageData: PageData,
  blockedCrawlers: z.array(z.string()).default([]),
  errors: z.array(z.string()).default([]),
})
export type CollectResult = z.infer<typeof CollectResult>

export const ScoreResult = z.object({
  scores: GeoScores,
  findings: z.array(Finding),
  crawlerAccess: z.array(CrawlerAccess),
})
export type ScoreResult = z.infer<typeof ScoreResult>
