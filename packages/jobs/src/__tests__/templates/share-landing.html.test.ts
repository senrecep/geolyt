import { describe, expect, it } from 'bun:test'
import { buildShareLandingHtml } from '../../templates/share-landing.html.js'

describe('buildShareLandingHtml', () => {
  const baseInput = {
    url: 'https://example.com',
    compositeScore: 67,
    shareUrl: 'https://geolyt.io/reports/share/test-token',
    pdfUrl: 'https://cdn.geolyt.io/reports/test.pdf',
    brandName: 'Geolyt',
    logoUrl: 'https://geolyt.io/logo.png',
  }

  it('includes the URL in the title', () => {
    const html = buildShareLandingHtml(baseInput)
    expect(html).toContain('example.com')
  })

  it('renders OG meta tags', () => {
    const html = buildShareLandingHtml(baseInput)
    expect(html).toContain('<meta property="og:title"')
    expect(html).toContain('<meta property="og:description"')
    expect(html).toContain('<meta property="og:image"')
    expect(html).toContain('<meta property="og:url"')
  })

  it('renders Twitter card meta tags', () => {
    const html = buildShareLandingHtml(baseInput)
    expect(html).toContain('<meta name="twitter:card"')
  })

  it('includes a link to the PDF report', () => {
    const html = buildShareLandingHtml(baseInput)
    expect(html).toContain(baseInput.pdfUrl)
  })

  it('uses the provided brand name and logo', () => {
    const html = buildShareLandingHtml({ ...baseInput, brandName: 'Agency X' })
    expect(html).toContain('Agency X')
    expect(html).toContain(baseInput.logoUrl)
  })
})
