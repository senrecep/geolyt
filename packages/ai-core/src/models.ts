import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { LanguageModel } from 'ai'

function googleApiKey(): string | undefined {
  return process.env.GOOGLE_AI_API_KEY
}

function anthropicApiKey(): string | undefined {
  return process.env.ANTHROPIC_API_KEY
}

export function createGoogleProvider() {
  const apiKey = googleApiKey()
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY is not set')
  }
  return createGoogleGenerativeAI({ apiKey })
}

export function createAnthropicProvider() {
  const apiKey = anthropicApiKey()
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set')
  }
  return createAnthropic({ apiKey })
}

export function scoringModels(): LanguageModel[] {
  const google = createGoogleProvider()
  return [google('gemini-3.1-flash-lite'), google('gemini-2.5-flash-lite')]
}

export function narrativeModels(): LanguageModel[] {
  const google = createGoogleProvider()
  const models: LanguageModel[] = [
    google('gemini-3.5-flash'),
    google('gemini-3.1-pro-preview'),
    google('gemini-2.5-pro'),
  ]

  const anthropicApiKey = process.env.ANTHROPIC_API_KEY
  if (anthropicApiKey) {
    models.push(createAnthropic({ apiKey: anthropicApiKey })('claude-haiku-4-5'))
  }

  return models
}
