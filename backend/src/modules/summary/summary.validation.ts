import { z } from 'zod';

export const summaryQuerySchema = z.object({
  months: z.coerce.number().int().min(3).max(12).optional().default(6),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM.')
    .optional(),
});

export type SummaryQuery = z.infer<typeof summaryQuerySchema>;
