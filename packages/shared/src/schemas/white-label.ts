import { z } from 'zod'

export const WhiteLabelConfig = z.object({
  companyName: z.string().min(1).max(100).optional(),
  logoUrl: z.string().url().optional(),
  faviconUrl: z.string().url().optional(),
  primaryColor: z
    .string()
    .regex(/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/, 'Invalid hex color')
    .optional(),
  domain: z.string().min(1).optional(),
})

export type WhiteLabelConfig = z.infer<typeof WhiteLabelConfig>
