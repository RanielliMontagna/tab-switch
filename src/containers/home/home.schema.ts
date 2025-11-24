import { z } from 'zod'
import { INTERVAL } from '@/constants'
import { isValidUrl, normalizeUrl } from '@/utils/url'

export const minInterval = INTERVAL.MIN

// Custom URL validation with sanitization
const urlSchema = z
  .string()
  .min(1, 'URL is required')
  .refine((url) => isValidUrl(url), {
    message: 'Invalid URL. Only http:// and https:// protocols are allowed.',
  })
  .transform((url) => normalizeUrl(url))

export const newTabSchema = z.object({
  name: z.string().min(1, 'Required'),
  url: urlSchema,
  interval: z
    .number()
    .int()
    .positive()
    .min(minInterval, `Interval must be at least ${minInterval} ms`),
  saved: z.boolean().optional(),
})

export const tabSchema = newTabSchema.extend({
  id: z.number().int().positive(),
})

export const tabsFileSchema = z.array(newTabSchema)

// Schema for tab-rotate.json format (legacy format)
// nome = name, duracao (seconds) = interval (milliseconds)
export const tabRotateFileSchema = z.array(
  z.object({
    nome: z.string().min(1, 'Nome is required'),
    url: urlSchema,
    duracao: z.preprocess((val) => {
      // Convert seconds to milliseconds
      const seconds =
        typeof val === 'string'
          ? parseFloat(val)
          : typeof val === 'number'
            ? val
            : minInterval / 1000
      if (Number.isNaN(seconds) || seconds <= 0) {
        return minInterval
      }
      return Math.max(minInterval, Math.round(seconds * 1000))
    }, z.number().int().positive().min(minInterval)),
  })
)

// Union schema to support both formats
export const anyTabsFileSchema = z.union([tabsFileSchema, tabRotateFileSchema])

export type NewTabSchema = z.infer<typeof newTabSchema>
export type TabSchema = z.infer<typeof tabSchema>
