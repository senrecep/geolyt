import type { WhiteLabelConfig } from '@geolyt/shared'
import { Err } from 'tsentials/errors'
import { Result } from 'tsentials/result'
import { z } from 'zod'

// Local copy of the shared WhiteLabelConfig schema: the web bundle must not
// value-import @geolyt/shared (Turbopack cannot resolve its .js-suffixed TS
// imports). The `satisfies` tie below fails typecheck if this drifts from the
// shared type, so the two schemas cannot silently diverge.
const whiteLabelConfigSchema = z.object({
  companyName: z.string().min(1).max(100).optional(),
  logoUrl: z.string().url().optional(),
  faviconUrl: z.string().url().optional(),
  primaryColor: z
    .string()
    .regex(/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/, 'Invalid hex color')
    .optional(),
  domain: z.string().min(1).optional(),
}) satisfies z.ZodType<WhiteLabelConfig>

// The cookie is client-controlled: both the JSON parse and the shape check
// must survive malformed input without throwing.
export function parseWhiteLabelCookie(value: string): WhiteLabelConfig | null {
  const parsed = Result.try(
    () => JSON.parse(value) as unknown,
    (error) => Err.unexpected('Web.WhiteLabelCookie', `Malformed white-label cookie: ${error}`),
  )
  if (!parsed.ok) {
    return null
  }
  return whiteLabelConfigSchema.safeParse(parsed.value).data ?? null
}
