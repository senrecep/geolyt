export interface ShareLandingInput {
  url: string
  compositeScore: number
  shareUrl: string
  pdfUrl: string
  brandName: string
  logoUrl: string
}

export function buildShareLandingHtml(input: ShareLandingInput): string {
  const hostname = new URL(input.url).hostname
  const title = `GEO Audit Report — ${hostname} — ${input.compositeScore}/100`
  const description = `See how ${hostname} scores for AI search visibility, citability, and structured data.`

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escapeHtml(input.shareUrl)}">
  <meta property="og:image" content="${escapeHtml(input.logoUrl)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(input.logoUrl)}">
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 2rem; background: #fafafa; color: #111; }
    main { max-width: 680px; margin: 0 auto; text-align: center; }
    .score { font-size: 4rem; font-weight: 700; line-height: 1; margin: 1rem 0; }
    .url { color: #666; margin-bottom: 2rem; }
    .button { display: inline-block; padding: 0.75rem 1.5rem; background: #111; color: #fff; text-decoration: none; border-radius: 0.5rem; }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(input.brandName)} GEO Audit</h1>
    <div class="score">${input.compositeScore}<span style="font-size:1.5rem;color:#666">/100</span></div>
    <p class="url">${escapeHtml(input.url)}</p>
    <a class="button" href="${escapeHtml(input.pdfUrl)}">View full report</a>
  </main>
</body>
</html>`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
