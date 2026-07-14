import { describe, expect, it } from 'bun:test'
import { segmentBlocks } from '../../collectors/segment-blocks.js'

describe('segmentBlocks', () => {
  it('creates blocks for headings and paragraphs', () => {
    const html = `
      <html><body>
        <h1>Title</h1>
        <p>First paragraph with 5 words total.</p>
        <h2>Section A</h2>
        <p>Section content.</p>
        <ul><li>Item one</li><li>Item two</li></ul>
      </body></html>
    `
    const blocks = segmentBlocks(html)

    expect(blocks.length).toBeGreaterThanOrEqual(4)
    expect(blocks[0]?.tag).toBe('h1')
    expect(blocks.some((b) => b.tag === 'ul')).toBe(true)
  })

  it('tracks heading hierarchy on blocks', () => {
    const html = `
      <body>
        <h1>Title</h1>
        <h2>Section</h2>
        <p>Paragraph</p>
      </body>
    `
    const blocks = segmentBlocks(html)
    const paragraph = blocks.find((b) => b.tag === 'p')

    expect(paragraph).toBeDefined()
    expect(paragraph?.headings.map((h) => h.text)).toContain('Section')
  })

  it('detects statistical and quote signals', () => {
    const html = `
      <body>
        <p>Revenue grew 25% this year.</p>
        <blockquote>"The best product we have used."</blockquote>
      </body>
    `
    const blocks = segmentBlocks(html)

    const statBlock = blocks.find((b) => b.text.includes('25%'))
    const quoteBlock = blocks.find((b) => b.tag === 'blockquote')

    expect(statBlock?.hasStats).toBe(true)
    expect(quoteBlock?.hasQuote).toBe(true)
  })

  it('strips script and style content', () => {
    const html = `
      <body>
        <script>const x = 1;</script>
        <style>.red { color: red; }</style>
        <p>Visible text.</p>
      </body>
    `
    const blocks = segmentBlocks(html)
    const combined = blocks.map((b) => b.text).join(' ')

    expect(combined).not.toContain('const x')
    expect(combined).not.toContain('.red')
    expect(combined).toContain('Visible text')
  })
})
