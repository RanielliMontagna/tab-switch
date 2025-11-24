import { z } from 'zod'
import { INTERVAL } from '@/constants'
import { isValidUrl, normalizeUrl } from '@/utils/url'

export const minInterval = INTERVAL.MIN

// Custom URL validation with sanitization
// Messages will be translated via zod-i18n error map
const urlSchema = z
  .string()
  .min(1) // Message will be translated via error map
  .refine((url) => isValidUrl(url), {
    message: 'validation.url.invalid', // Translation key
  })
  .transform((url) => normalizeUrl(url))

export const newTabSchema = z.object({
  name: z.string().min(1), // Message will be translated via error map
  url: urlSchema,
  interval: z.number().int().positive().min(minInterval), // Message will be translated via error map with minInterval as param
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
    nome: z.string().min(1), // Message will be translated via error map
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

/**
 * Schema for a rotation session
 */
export const sessionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  tabs: z.array(tabSchema),
  createdAt: z.number().int().positive().optional(),
  updatedAt: z.number().int().positive().optional(),
})

/**
 * Schema for sessions storage
 */
export const sessionsStorageSchema = z.object({
  sessions: z.array(sessionSchema),
  currentSessionId: z.string().min(1).optional(),
})

export type NewTabSchema = z.infer<typeof newTabSchema>
export type TabSchema = z.infer<typeof tabSchema>
export type SessionSchema = z.infer<typeof sessionSchema>
export type SessionsStorageSchema = z.infer<typeof sessionsStorageSchema>
