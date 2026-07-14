import type { AuditResult, Finding } from '@geolyt/shared'
import type { LanguageModel } from 'ai'
import { Err } from 'tsentials/errors'
import { Result } from 'tsentials/result'
import { z } from 'zod'
import { buildEvidence } from './prompts/evidence.js'
import { geoRubric } from './prompts/rubric.js'

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

export type GenerateObjectFn = (args: GenerateObjectArgs) => Promise<{ object: SynthesisOutput }>

async function defaultGenerate(args: GenerateObjectArgs): Promise<{ object: SynthesisOutput }> {
  const { generateObject } = await import('ai')
  return generateObject({
    model: args.model,
    system: args.system,
    prompt: args.prompt,
    schema: args.schema,
  })
}

export async function synthesize(
  audit: AuditResult,
  model: LanguageModel,
  generate: GenerateObjectFn = defaultGenerate,
): Promise<Result<SynthesisOutput>> {
  try {
    const { object } = await generate({
      model,
      system: geoRubric,
      prompt: buildEvidence(audit),
      schema: SynthesisOutputSchema,
    })
    return Result.success(object)
  } catch (error) {
    return Result.failure(
      Err.unexpected(
        'AI.SynthesisFailed',
        error instanceof Error ? error.message : 'AI synthesis failed',
      ),
    )
  }
}
