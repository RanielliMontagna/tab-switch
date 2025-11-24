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
  interval: z.coerce
    .number()
    .int()
    .positive()
    .min(minInterval, 'Interval must be at least 5000 ms'),
  saved: z.boolean().optional(),
})

export const tabSchema = newTabSchema.extend({
  id: z.number().int().positive(),
})

export const tabsFileSchema = z.array(newTabSchema)

export type NewTabSchema = z.infer<typeof newTabSchema>
export type TabSchema = z.infer<typeof tabSchema>
