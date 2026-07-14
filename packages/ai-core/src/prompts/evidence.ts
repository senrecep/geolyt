import type { AuditResult } from '@geolyt/shared'

export function buildEvidence(audit: AuditResult): string {
  const lines: string[] = []

  lines.push(`# Audit evidence for ${audit.url}`)
  lines.push('')
  lines.push('## Scores')
  lines.push(`- AI Citability & Visibility: ${audit.scores.aiCitability}`)
  lines.push(`- Brand Authority Signals: ${audit.scores.brandAuthority}`)
  lines.push(`- Content Quality & E-E-A-T: ${audit.scores.contentQuality}`)
  lines.push(`- Technical Foundations: ${audit.scores.technicalFoundation}`)
  lines.push(`- Structured Data: ${audit.scores.structuredData}`)
  lines.push(`- Platform Optimization: ${audit.scores.platformOptimization}`)
  lines.push(`- Composite GEO Score: ${audit.scores.composite}`)
  lines.push('')

  if (audit.findings.length > 0) {
    lines.push('## Existing findings')
    for (const finding of audit.findings) {
      lines.push(`- [${finding.severity}] ${finding.code}: ${finding.title}`)
      lines.push(`  ${finding.description}`)
      if (finding.recommendation) {
        lines.push(`  Recommendation: ${finding.recommendation}`)
      }
    }
    lines.push('')
  }

  if (audit.crawlerAccess.length > 0) {
    lines.push('## AI crawler access')
    for (const entry of audit.crawlerAccess) {
      lines.push(
        `- ${entry.name} (tier ${entry.tier}): ${entry.allowed ? 'allowed' : 'blocked'}${entry.reason ? ` — ${entry.reason}` : ''}`,
      )
    }
    lines.push('')
  }

  lines.push('## Instructions')
  lines.push('Use the evidence above to produce an executive summary and, if needed,')
  lines.push('additional findings. Do not contradict the existing scores.')

  return lines.join('\n')
}
