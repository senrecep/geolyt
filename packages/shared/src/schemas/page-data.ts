import { z } from 'zod'

export const HeadingLevel = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
])
export type HeadingLevel = z.infer<typeof HeadingLevel>

export const HeadingSchema = z.object({
  level: HeadingLevel,
  text: z.string(),
})
export type HeadingSchema = z.infer<typeof HeadingSchema>

export const ContentBlock = z.object({
  id: z.string(),
  tag: z.enum(['h1', 'h2', 'h3', 'p', 'ul', 'ol', 'table', 'pre', 'blockquote']),
  headings: z.array(HeadingSchema),
  text: z.string(),
  wordCount: z.number().int().nonnegative(),
  hasStats: z.boolean().default(false),
  hasQuote: z.boolean().default(false),
})
export type ContentBlock = z.infer<typeof ContentBlock>

export const PageData = z.object({
  url: z.string().url(),
  finalUrl: z.string().url(),
  html: z.string(),
  title: z.string(),
  metaDescription: z.string().optional().nullable(),
  canonical: z.string().url().optional().nullable(),
  headings: z.array(HeadingSchema),
  contentBlocks: z.array(ContentBlock),
  structuredData: z.array(z.record(z.unknown())),
  robots: z.string().optional().nullable(),
  llmsTxt: z.string().optional().nullable(),
  headers: z.record(z.string()).default({}),
  contentInRawHtml: z.boolean().default(true),
  collectedAt: z.coerce.date(),
})
export type PageData = z.infer<typeof PageData>
