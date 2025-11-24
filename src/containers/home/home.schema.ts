import { z } from 'zod'
import { INTERVAL } from '@/constants'

export const minInterval = INTERVAL.MIN

export const newTabSchema = z.object({
  name: z.string().min(1, 'Required'),
  url: z.string().url(),
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
