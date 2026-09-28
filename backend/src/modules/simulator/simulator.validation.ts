import { z } from 'zod';
import { EXPENSE_CATEGORIES } from '../expense/expense.model.js';

export const simulateSchema = z.object({
  categoryCutPercent: z.coerce.number().min(0).max(100).optional().default(0),
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  extraSavingsMonthly: z.coerce.number().min(0).optional().default(0),
  incomeChangePercent: z.coerce.number().min(-100).max(200).optional().default(0),
});

export type SimulateInput = z.infer<typeof simulateSchema>;
