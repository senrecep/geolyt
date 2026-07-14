import type { ContentBlock, HeadingSchema } from '@geolyt/shared'
import * as cheerio from 'cheerio'

const CONTENT_TAGS = new Set([
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'ul',
  'ol',
  'table',
  'pre',
  'blockquote',
])

const STATS_PATTERN = /\d+([.,]\d+)?%?|\b\d{1,3}(,\d{3})+\b/
const QUOTE_PATTERN = /["“”‘’].+?["“”‘’]/

function countWords(text: string): number {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (cleaned.length === 0) return 0
  return cleaned.split(' ').length
}

function cloneHeadings(headings: HeadingSchema[]): HeadingSchema[] {
  return headings.map((h) => ({ ...h }))
}

function updateHeadings(
  headings: HeadingSchema[],
  level: HeadingSchema['level'],
  text: string,
): HeadingSchema[] {
  const trimmed = text.trim()
  const index = headings.findIndex((h) => h.level === level)

  if (index === -1) {
    return [...headings.filter((h) => h.level < level), { level, text: trimmed }]
  }

  return [...headings.slice(0, index), { level, text: trimmed }]
}

export function segmentBlocks(html: string): ContentBlock[] {
  const $ = cheerio.load(html)

  $('script, style, nav, header, footer, aside, noscript').remove()

  const blocks: ContentBlock[] = []
  let headings: HeadingSchema[] = []
  let blockIndex = 0

  $('body')
    .find('*')
    .each((_, element) => {
      const tag = element.tagName.toLowerCase()
      if (!CONTENT_TAGS.has(tag)) return

      const $el = $(element)
      const text = $el.text().trim()
      if (text.length === 0 && tag !== 'table') return

      if (tag.startsWith('h') && tag.length === 2) {
        const level = Number(tag[1]) as 1 | 2 | 3 | 4 | 5 | 6
        headings = updateHeadings(headings, level, text)
      }

      blocks.push({
        id: String(blockIndex++),
        tag: tag as ContentBlock['tag'],
        headings: cloneHeadings(headings),
        text,
        wordCount: countWords(text),
        hasStats: STATS_PATTERN.test(text),
        hasQuote: QUOTE_PATTERN.test(text),
      })
    })

  return blocks
}
