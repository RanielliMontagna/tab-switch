import { z } from 'zod'

export const newTabSchema = z.object({
  name: z.string(),
  url: z.string().url(),
  interval: z.number().int().positive(),
  saved: z.boolean().optional(),
})

export type TabSchema = z.infer<typeof newTabSchema>
