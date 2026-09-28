import { z } from 'zod';

export const reportQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Use a valid month (YYYY-MM).')
    .optional(),
});

export type ReportQuery = z.infer<typeof reportQuerySchema>;
