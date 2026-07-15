import type { AuditDelta, AuditResult } from '@geolyt/shared'

interface DeltaReportInput {
  auditA: AuditResult
  auditB: AuditResult
  delta: AuditDelta
}

function categoryLabel(key: keyof AuditResult['scores']): string {
  const labels: Record<string, string> = {
    composite: 'Composite GEO Score',
    aiCitability: 'AI Citability',
    brandAuthority: 'Brand Authority',
    contentQuality: 'Content Quality',
    technicalFoundation: 'Technical Foundation',
    structuredData: 'Structured Data',
    platformOptimization: 'Platform Optimization',
  }
  return labels[key] ?? key
}

function scoreRow(label: string, before: number, after: number): string {
  const change = after - before
  const sign = change > 0 ? '+' : ''
  const changeClass = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral'
  return `
    <tr>
      <td class="category">${label}</td>
      <td class="before">${before}</td>
      <td class="after">${after}</td>
      <td class="change ${changeClass}">${sign}${change}</td>
    </tr>
  `
}

export function buildDeltaReportHtml({ auditA, auditB, delta }: DeltaReportInput): string {
  const categories = [
    'composite',
    'aiCitability',
    'brandAuthority',
    'contentQuality',
    'technicalFoundation',
    'structuredData',
    'platformOptimization',
  ] as const

  const rows = categories.map((key) =>
    scoreRow(categoryLabel(key), auditA.scores[key], auditB.scores[key]),
  )

  const changes = categories
    .map((key) => ({
      key,
      label: categoryLabel(key),
      before: auditA.scores[key],
      after: auditB.scores[key],
      change: auditB.scores[key] - auditA.scores[key],
    }))
    .filter((c) => c.change !== 0)

  const improvements = changes
    .filter((c) => c.change > 0)
    .sort((a, b) => b.change - a.change)
    .slice(0, 3)
  const regressions = changes
    .filter((c) => c.change < 0)
    .sort((a, b) => a.change - b.change)
    .slice(0, 3)

  const compositeBefore = auditA.scores.composite
  const compositeAfter = auditB.scores.composite
  const compositeChange = compositeAfter - compositeBefore
  const summary =
    compositeChange === 0
      ? `Score stayed at ${compositeAfter}/100`
      : `Score ${compositeChange > 0 ? 'improved' : 'dropped'} from ${compositeBefore} to ${compositeAfter} (${compositeChange > 0 ? '+' : ''}${compositeChange} pts)`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GEO Monthly Delta Report — ${auditB.url}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 40px; color: #111; background: #fff; }
    h1 { font-size: 28px; margin-bottom: 8px; }
    h2 { font-size: 20px; margin-top: 32px; margin-bottom: 12px; border-bottom: 1px solid #e5e5e5; padding-bottom: 8px; }
    .meta { color: #666; margin-bottom: 24px; }
    .summary { font-size: 18px; font-weight: 600; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th, td { text-align: left; padding: 12px; border-bottom: 1px solid #e5e5e5; }
    th { font-size: 12px; text-transform: uppercase; color: #666; }
    .category { width: 60%; }
    .change { font-weight: 600; }
    .positive { color: #16a34a; }
    .negative { color: #dc2626; }
    .neutral { color: #666; }
    .top-list { list-style: none; padding: 0; margin: 0; }
    .top-list li { padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
    footer { margin-top: 40px; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <h1>GEO Monthly Delta Report</h1>
  <p class="meta">${auditB.url}</p>
  <p class="summary">${summary}</p>

  <h2>Score Changes</h2>
  <table>
    <thead>
      <tr>
        <th class="category">Category</th>
        <th>Before</th>
        <th>After</th>
        <th>Change</th>
      </tr>
    </thead>
    <tbody>
      ${rows.join('')}
    </tbody>
  </table>

  <h2>Top Improvements</h2>
  ${improvements.length > 0 ? `<ul class="top-list">${improvements.map((i) => `<li>${i.label}: +${i.change} pts</li>`).join('')}</ul>` : '<p>No improvements this period.</p>'}

  <h2>Top Regressions</h2>
  ${regressions.length > 0 ? `<ul class="top-list">${regressions.map((r) => `<li>${r.label}: ${r.change} pts</li>`).join('')}</ul>` : '<p>No regressions this period.</p>'}

  <footer>
    Comparing ${auditA.generatedAt.toISOString()} to ${auditB.generatedAt.toISOString()} · Delta ID ${delta.id}
  </footer>
</body>
</html>`
}
