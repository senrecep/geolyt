export interface AiUsage {
  promptTokens: number
  completionTokens: number
  cachedPromptTokens: number
}

export function emptyAiUsage(): AiUsage {
  return {
    promptTokens: 0,
    completionTokens: 0,
    cachedPromptTokens: 0,
  }
}
