import { z } from 'zod';
import { INCOME_TYPES } from './income.model.js';

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date (YYYY-MM-DD).');

export const createIncomeSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than 0.'),
  source: z.string().trim().min(2, 'Source must be at least 2 characters.').max(120),
  date: dateString,
  incomeType: z.enum(INCOME_TYPES, { errorMap: () => ({ message: 'Select a valid income type.' }) }),
  description: z.string().trim().max(240).optional().or(z.literal('')),
  recurring: z.boolean().optional().default(false),
});

export const updateIncomeSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than 0.').optional(),
  source: z.string().trim().min(2, 'Source must be at least 2 characters.').max(120).optional(),
  date: dateString.optional(),
  incomeType: z.enum(INCOME_TYPES, { errorMap: () => ({ message: 'Select a valid income type.' }) }).optional(),
  description: z.string().trim().max(240).optional().or(z.literal('')),
  recurring: z.boolean().optional(),
});

export const listIncomeQuerySchema = z.object({
  search: z.string().trim().optional(),
  incomeType: z.enum(INCOME_TYPES).optional().or(z.literal('ALL')),
  from: dateString.optional(),
  to: dateString.optional(),
});

export type CreateIncomeInput = z.infer<typeof createIncomeSchema>;
export type UpdateIncomeInput = z.infer<typeof updateIncomeSchema>;
export type ListIncomeQuery = z.infer<typeof listIncomeQuerySchema>;
