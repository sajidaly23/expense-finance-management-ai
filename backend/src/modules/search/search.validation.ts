import { z } from 'zod';

export const searchQuerySchema = z.object({
  q: z.string().trim().min(2, 'Enter at least 2 characters.').max(120),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
