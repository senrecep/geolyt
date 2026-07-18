import type { AiUsage, AuditResult, Finding } from '@geolyt/shared'
import type { LanguageModel } from 'ai'
import { Err } from 'tsentials/errors'
import { type Result, ResultAsync } from 'tsentials/result'
import { z } from 'zod'
import { thinkingProviderOptions, thinkingTierForModel } from './models.js'
import { buildEvidence } from './prompts/evidence.js'
import { geoRubric } from './prompts/rubric.js'
import { extractCachedPromptTokens } from './usage.js'

const SynthesisOutputSchema = z.object({
  executiveSummary: z.string().min(1),
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
  aiSynthesisUsed: z.literal(true),
})

export type SynthesisOutput = z.infer<typeof SynthesisOutputSchema>

export interface GenerateObjectArgs {
  model: LanguageModel
  system: string
  prompt: string
  schema: typeof SynthesisOutputSchema
}

export type GenerateObjectFn = (args: GenerateObjectArgs) => Promise<{
  object: SynthesisOutput
  usage: AiUsage
}>

async function defaultGenerate(
  args: GenerateObjectArgs,
): Promise<{ object: SynthesisOutput; usage: AiUsage }> {
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

export type SynthesisResult = {
  output: SynthesisOutput
  usage: AiUsage
}

export async function synthesize(
  audit: AuditResult,
  model: LanguageModel,
  generate: GenerateObjectFn = defaultGenerate,
): Promise<Result<SynthesisResult>> {
  return ResultAsync.try(
    async () => {
      const { object, usage } = await generate({
        model,
        system: geoRubric,
        prompt: buildEvidence(audit),
        schema: SynthesisOutputSchema,
      })
      return { output: object, usage }
    },
    (error) =>
      Err.unexpected(
        'AI.SynthesisFailed',
        error instanceof Error ? error.message : 'AI synthesis failed',
      ),
  )
}
