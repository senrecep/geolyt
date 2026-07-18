import { estimateCost } from '@geolyt/ai-core'
import { apiKeys, clients, db } from '@geolyt/db'
import { type AiUsage, emptyAiUsage } from '@geolyt/shared'
import { eq } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { auth } from '../auth.js'

async function resolveClientId(headers: Headers): Promise<string | null> {
  const key = headers.get('x-api-key')
  if (key) {
    const records = await db.select().from(apiKeys).where(eq(apiKeys.isActive, true))
    for (const record of records) {
      if (await Bun.password.verify(key, record.keyHash)) {
        await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, record.id))
        return record.clientId ?? null
      }
    }
    return null
  }

  const session = await auth.api.getSession({ headers })
  if (!session?.user?.email) {
    return null
  }

  const client = await db.query.clients.findFirst({
    where: eq(clients.email, session.user.email),
  })
  return client?.id ?? null
}

export const usageRoute = new Elysia({ prefix: '/usage' }).get('/', async ({ request, set }) => {
  const clientId = await resolveClientId(request.headers)
  if (!clientId) {
    set.status = 401
    return { error: 'Unauthorized' }
  }

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const since = thirtyDaysAgo.toISOString().slice(0, 7)

  const rows = await db.query.usage.findMany({
    where: (usage, { and, eq, gte }) => and(eq(usage.clientId, clientId), gte(usage.period, since)),
    orderBy: (usage, { desc }) => [desc(usage.period)],
  })

  const cached = rows.reduce((sum, r) => sum + (r.aiTokensCached ?? 0), 0)
  const uncached = rows.reduce((sum, r) => sum + (r.aiTokensUncached ?? 0), 0)
  const output = rows.reduce((sum, r) => sum + (r.aiTokensOutput ?? 0), 0)

  const total: AiUsage = {
    promptTokens: cached + uncached,
    cachedPromptTokens: cached,
    completionTokens: output,
  }
  const cacheHitRate =
    total.promptTokens === 0
      ? 0
      : Math.round((total.cachedPromptTokens / total.promptTokens) * 1000) / 1000

  const byModelUsage = new Map<string, AiUsage>()
  for (const row of rows) {
    if (!row.model) {
      continue
    }
    const modelUsage = byModelUsage.get(row.model) ?? emptyAiUsage()
    const rowCached = row.aiTokensCached ?? 0
    const rowUncached = row.aiTokensUncached ?? 0
    modelUsage.cachedPromptTokens += rowCached
    modelUsage.promptTokens += rowCached + rowUncached
    modelUsage.completionTokens += row.aiTokensOutput ?? 0
    byModelUsage.set(row.model, modelUsage)
  }

  // Pricing varies per model, so the aggregate cost is the sum of each
  // model's cost computed at its own rate rather than a blended estimate.
  const byModel = Array.from(byModelUsage.entries()).map(([model, modelUsage]) => ({
    model,
    cached: modelUsage.cachedPromptTokens,
    uncached: modelUsage.promptTokens - modelUsage.cachedPromptTokens,
    output: modelUsage.completionTokens,
    estimated_cost_usd: estimateCost(modelUsage, model),
  }))
  const cost = byModel.reduce((sum, m) => sum + m.estimated_cost_usd, 0)

  return {
    period_days: 30,
    ai_tokens: {
      cached,
      uncached,
      output,
    },
    estimated_cost_usd: cost,
    cache_hit_rate: cacheHitRate,
    by_model: byModel,
    records: rows.map((row) => ({
      period: row.period,
      cached: row.aiTokensCached ?? 0,
      uncached: row.aiTokensUncached ?? 0,
      output: row.aiTokensOutput ?? 0,
    })),
  }
})
