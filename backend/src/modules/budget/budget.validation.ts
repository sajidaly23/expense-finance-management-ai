import { z } from 'zod';
import { EXPENSE_CATEGORIES } from '../expense/expense.model.js';

const monthString = z.string().regex(/^\d{4}-\d{2}$/, 'Use a valid month (YYYY-MM).');

export const createBudgetSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than 0.'),
  month: monthString,
  category: z.enum(EXPENSE_CATEGORIES, { errorMap: () => ({ message: 'Select a valid category.' }) }).optional(),
});

export const updateBudgetSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than 0.').optional(),
  month: monthString.optional(),
  category: z.union([z.enum(EXPENSE_CATEGORIES), z.literal('')]).optional(),
});

export const listBudgetQuerySchema = z.object({
  month: monthString.optional(),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
export type ListBudgetQuery = z.infer<typeof listBudgetQuerySchema>;
