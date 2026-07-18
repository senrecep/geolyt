import type { AiUsage, Finding, PageData } from '@geolyt/shared'
import type { LanguageModel } from 'ai'
import { Err } from 'tsentials/errors'
import { type Result, ResultAsync } from 'tsentials/result'
import { z } from 'zod'
import { thinkingProviderOptions, thinkingTierForModel } from './models.js'
import { eeatRubric } from './prompts/eeat-rubric.js'
import { extractCachedPromptTokens } from './usage.js'

const EeatOutputSchema = z.object({
  score: z.number().min(0).max(100),
  findings: z.array(
    z.custom<Finding>((value) => {
      const parsed = value as Finding
      return (
        typeof parsed.code === 'string' &&
        typeof parsed.title === 'string' &&
        typeof parsed.description === 'string' &&
        typeof parsed.severity === 'string'
      )
    }),
  ),
})

export type EeatOutput = z.infer<typeof EeatOutputSchema>

export interface EeatGenerateObjectArgs {
  model: LanguageModel
  system: string
  prompt: string
  schema: typeof EeatOutputSchema
}

export type EeatGenerateObjectFn = (args: EeatGenerateObjectArgs) => Promise<{
  object: EeatOutput
  usage: AiUsage
}>

async function defaultGenerate(
  args: EeatGenerateObjectArgs,
): Promise<{ object: EeatOutput; usage: AiUsage }> {
  const { generateObject } = await import('ai')
  const { object, usage, response } = await generateObject({
    model: args.model,
    system: args.system,
    prompt: args.prompt,
    schema: args.schema,
    providerOptions: thinkingProviderOptions(thinkingTierForModel(args.model.modelId)),
  })
  return {
    object,
    usage: {
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      cachedPromptTokens: extractCachedPromptTokens(response.body),
    },
  }
}

function buildEeatPrompt(pageData: PageData): string {
  const lines: string[] = []
  lines.push('# Page content for E-E-A-T evaluation')
  lines.push('')
  lines.push(`URL: ${pageData.url}`)
  lines.push(`Title: ${pageData.title ?? 'not provided'}`)
  lines.push(`Description: ${pageData.metaDescription ?? 'not provided'}`)
  lines.push('')
  lines.push('## Content blocks')
  for (const block of pageData.contentBlocks) {
    const label = block.headings[0]?.text ?? block.tag
    lines.push(`- ${label}: ${block.text.slice(0, 200)}`)
  }
  lines.push('')
  lines.push('Evaluate the page for E-E-A-T and return a score plus findings.')
  return lines.join('\n')
}

export type EeatJudgeResult = {
  output: EeatOutput
  usage: AiUsage
}

export async function judgeEeat(
  pageData: PageData,
  model: LanguageModel,
  generate: EeatGenerateObjectFn = defaultGenerate,
): Promise<Result<EeatJudgeResult>> {
  return ResultAsync.try(
    async () => {
      const { object, usage } = await generate({
        model,
        system: eeatRubric,
        prompt: buildEeatPrompt(pageData),
        schema: EeatOutputSchema,
      })
      return { output: object, usage }
    },
    (error) =>
      Err.unexpected(
        'AI.EeatJudgeFailed',
        error instanceof Error ? error.message : 'E-E-A-T judge failed',
      ),
  )
}
