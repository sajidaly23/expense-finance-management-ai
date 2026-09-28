import { z } from 'zod';

export const reconcileSchema = z.object({
  csv: z.string().trim().min(1, 'Paste a statement or choose a CSV file.'),
});

export const importMissingSchema = z.object({
  rows: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date (YYYY-MM-DD).'),
        amount: z.coerce.number().positive('Amount must be greater than 0.'),
        description: z.string().trim().min(2).max(240),
      })
    )
    .min(1, 'Choose at least one statement line.'),
});
