import type { AuditResult, Finding } from '@geolyt/shared'

function severityClass(severity: Finding['severity']): string {
  const map: Record<Finding['severity'], string> = {
    critical: 'bg-red-100 text-red-900',
    high: 'bg-orange-100 text-orange-900',
    medium: 'bg-yellow-100 text-yellow-900',
    low: 'bg-blue-100 text-blue-900',
    info: 'bg-gray-100 text-gray-900',
  }
  return map[severity]
}

export function buildReportHtml(audit: AuditResult): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GEO Audit Report — ${audit.url}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 40px; color: #111; background: #fff; }
    h1 { font-size: 28px; margin-bottom: 8px; }
    h2 { font-size: 20px; margin-top: 32px; margin-bottom: 12px; border-bottom: 1px solid #e5e5e5; padding-bottom: 8px; }
    .meta { color: #666; margin-bottom: 24px; }
    .score-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
    .score-card { border: 1px solid #e5e5e5; border-radius: 8px; padding: 16px; }
    .score-card .label { font-size: 12px; color: #666; text-transform: uppercase; }
    .score-card .value { font-size: 24px; font-weight: 700; margin-top: 4px; }
    .findings { list-style: none; padding: 0; margin: 0; }
    .finding { border: 1px solid #e5e5e5; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
    .finding-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .badge { font-size: 11px; font-weight: 600; padding: 4px 8px; border-radius: 999px; text-transform: uppercase; }
    .finding-title { font-weight: 600; }
    .finding-description { color: #444; margin-bottom: 8px; }
    .finding-recommendation { color: #666; font-size: 14px; }
    footer { margin-top: 40px; color: #999; font-size: 12px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>GEO Audit Report</h1>
  <p class="meta">${audit.url} · Generated at ${audit.generatedAt.toISOString()}</p>

  <div class="score-grid">
    <div class="score-card">
      <div class="label">Composite GEO Score</div>
      <div class="value">${audit.scores.composite}/100</div>
    </div>
    <div class="score-card">
      <div class="label">AI Citability</div>
      <div class="value">${audit.scores.aiCitability}</div>
    </div>
    <div class="score-card">
      <div class="label">Brand Authority</div>
      <div class="value">${audit.scores.brandAuthority}</div>
    </div>
    <div class="score-card">
      <div class="label">Content Quality</div>
      <div class="value">${audit.scores.contentQuality}</div>
    </div>
    <div class="score-card">
      <div class="label">Technical Foundation</div>
      <div class="value">${audit.scores.technicalFoundation}</div>
    </div>
    <div class="score-card">
      <div class="label">Structured Data</div>
      <div class="value">${audit.scores.structuredData}</div>
    </div>
  </div>

  <h2>Findings (${audit.findings.length})</h2>
  <ul class="findings">
    ${audit.findings
      .map(
        (f) => `
      <li class="finding">
        <div class="finding-header">
          <span class="badge ${severityClass(f.severity)}">${f.severity}</span>
          <span class="finding-title">${f.title}</span>
        </div>
        <div class="finding-description">${f.description}</div>
        ${f.recommendation ? `<div class="finding-recommendation">Recommendation: ${f.recommendation}</div>` : ''}
      </li>
    `,
      )
      .join('')}
  </ul>

  <footer>
    AI synthesis ${audit.aiSynthesisUsed ? 'used' : 'not used'} · Report ID ${audit.auditId}
  </footer>
</body>
</html>`
}
