import { z } from 'zod'

export const newTabSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  url: z.string().url(),
  interval: z.number().int().positive(),
  saved: z.boolean().optional(),
})

export const tabSchema = newTabSchema.extend({
  id: z.number().int().positive(),
})

export type NewTabSchema = z.infer<typeof newTabSchema>
export type TabSchema = z.infer<typeof tabSchema>
