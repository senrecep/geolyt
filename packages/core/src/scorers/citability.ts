import { CITABILITY_WEIGHTS, type Finding, GeoErr, type PageData } from '@geolyt/shared'
import { Result } from 'tsentials/result'
import type { ScorerOutput } from './types.js'

const MIN_ANSWER_WORDS = 40
const MAX_ANSWER_WORDS = 300
const IDEAL_PARAGRAPH_WORDS = 80

function isHeadingBlock(tag: string): boolean {
  return tag.length === 2 && tag.startsWith('h')
}

function contentBlocks(pageData: PageData) {
  return pageData.contentBlocks.filter((b) => !isHeadingBlock(b.tag))
}

function scoreAnswerBlockQuality(pageData: PageData): number {
  const blocks = contentBlocks(pageData)
  if (blocks.length === 0) return 0

  let points = 0
  for (const block of blocks) {
    const hasRichFormat = ['ul', 'ol', 'table', 'pre', 'blockquote'].includes(block.tag)
    const inRange = block.wordCount >= MIN_ANSWER_WORDS && block.wordCount <= MAX_ANSWER_WORDS

    if (inRange && (hasRichFormat || block.hasStats || block.hasQuote)) {
      points += 1
    } else if (inRange && block.headings.length > 0) {
      points += 0.6
    } else if (block.wordCount >= 20) {
      points += 0.2
    }
  }

  return (points / blocks.length) * 100
}

function scoreSelfContainment(pageData: PageData): number {
  const blocks = contentBlocks(pageData)
  if (blocks.length === 0) return 0

  let points = 0
  for (const block of blocks) {
    const hasContext = block.headings.length > 0
    const reasonableLength = block.wordCount >= 40 && block.wordCount <= 400

    if (hasContext && reasonableLength) {
      points += 1
    } else if (hasContext || reasonableLength) {
      points += 0.5
    }
  }

  return (points / blocks.length) * 100
}

function scoreStructuralReadability(pageData: PageData): number {
  const blocks = contentBlocks(pageData)
  const headingLevels = new Set(pageData.headings.map((h) => h.level))
  const hasH2 = headingLevels.has(2)
  const hasH3 = headingLevels.has(3)
  const listOrTableBlocks = blocks.filter((b) => ['ul', 'ol', 'table'].includes(b.tag)).length

  const paragraphBlocks = blocks.filter((b) => b.tag === 'p')
  const avgParagraphWords =
    paragraphBlocks.length === 0
      ? 0
      : paragraphBlocks.reduce((sum, b) => sum + b.wordCount, 0) / paragraphBlocks.length

  let points = 0
  if (hasH2) points += 25
  if (hasH3) points += 15
  if (listOrTableBlocks >= 2) points += 25
  if (avgParagraphWords > 0 && avgParagraphWords <= IDEAL_PARAGRAPH_WORDS) points += 25
  if (blocks.length >= 3) points += 10

  return Math.min(100, points)
}

function scoreStatisticalDensity(pageData: PageData): number {
  const blocks = contentBlocks(pageData)
  if (blocks.length === 0) return 0
  const statsBlocks = blocks.filter((b) => b.hasStats).length
  return (statsBlocks / blocks.length) * 100
}

function scoreUniqueness(pageData: PageData): number {
  const blocks = contentBlocks(pageData)
  if (blocks.length === 0) return 0
  const uniqueBlocks = blocks.filter(
    (b) => b.hasQuote || b.hasStats || b.tag === 'pre' || b.tag === 'blockquote',
  )
  return (uniqueBlocks.length / blocks.length) * 100
}

export function scoreCitability(pageData: PageData): Result<ScorerOutput> {
  const totalWords = contentBlocks(pageData).reduce((sum, b) => sum + b.wordCount, 0)
  if (totalWords === 0) {
    return Result.failure(GeoErr.noContent())
  }

  const answerBlock = scoreAnswerBlockQuality(pageData)
  const selfContainment = scoreSelfContainment(pageData)
  const structural = scoreStructuralReadability(pageData)
  const statsDensity = scoreStatisticalDensity(pageData)
  const uniqueness = scoreUniqueness(pageData)

  const composite =
    answerBlock * CITABILITY_WEIGHTS.answerBlock +
    selfContainment * CITABILITY_WEIGHTS.selfContainment +
    structural * CITABILITY_WEIGHTS.structuralReadability +
    statsDensity * CITABILITY_WEIGHTS.statisticalDensity +
    uniqueness * CITABILITY_WEIGHTS.uniqueness

  const findings: Finding[] = []
  if (answerBlock < 50) {
    findings.push({
      code: 'CITABILITY.AnswerBlocks',
      title: 'Few answer-ready content blocks',
      description:
        'Content rarely appears in the 40-300 word, self-contained format AI systems prefer to quote.',
      severity: 'high',
      recommendation:
        'Add concise sections with lists, tables or statistics under clear H2/H3 headings.',
    })
  }
  if (structural < 50) {
    findings.push({
      code: 'CITABILITY.Structure',
      title: 'Content structure is weak',
      description:
        'The page lacks the H2/H3 hierarchy and rich formatting that help AI models navigate content.',
      severity: 'medium',
      recommendation:
        'Use H2 sections, H3 subsections and bullet lists or tables where appropriate.',
    })
  }

  return Result.success({ score: Math.round(composite), findings })
}
