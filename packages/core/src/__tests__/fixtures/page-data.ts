import type { PageData } from '@geolyt/shared'

export function buildPageData(overrides: Partial<PageData> = {}): PageData {
  return {
    url: 'https://example.com',
    finalUrl: 'https://example.com',
    html: '<html><body><h1>Hello</h1></body></html>',
    title: 'Example Page',
    metaDescription: 'A page used for testing GEO scorers.',
    canonical: 'https://example.com',
    headings: [{ level: 1, text: 'Hello' }],
    contentBlocks: [
      {
        id: '1',
        tag: 'h1',
        headings: [{ level: 1, text: 'Hello' }],
        text: 'Hello',
        wordCount: 1,
        hasStats: false,
        hasQuote: false,
      },
      {
        id: '2',
        tag: 'p',
        headings: [{ level: 1, text: 'Hello' }],
        text: 'This is a sample paragraph with enough words to count as real content.',
        wordCount: 13,
        hasStats: false,
        hasQuote: false,
      },
    ],
    structuredData: [],
    robots: 'User-agent: *\nDisallow: /admin',
    llmsTxt: null,
    headers: { 'content-type': 'text/html' },
    contentInRawHtml: true,
    collectedAt: new Date(),
    ...overrides,
  }
}
