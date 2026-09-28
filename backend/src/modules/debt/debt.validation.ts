import { z } from 'zod';

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.');

export const createDebtSchema = z.object({
  name: z.string().trim().min(1).max(120),
  principal: z.coerce.number().positive(),
  interestRate: z.coerce.number().min(0).max(100),
  tenureMonths: z.coerce.number().int().min(1).max(600),
  paidMonths: z.coerce.number().int().min(0).optional().default(0),
  startDate: dateString,
  notes: z.string().trim().max(400).optional(),
});

export const updateDebtSchema = createDebtSchema.partial();

export type CreateDebtInput = z.infer<typeof createDebtSchema>;
export type UpdateDebtInput = z.infer<typeof updateDebtSchema>;
