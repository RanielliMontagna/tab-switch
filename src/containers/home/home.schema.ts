import { z } from 'zod'

export const minInterval = 5000

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

export type NewTabSchema = z.infer<typeof newTabSchema>
export type TabSchema = z.infer<typeof tabSchema>
