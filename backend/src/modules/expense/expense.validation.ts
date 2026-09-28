import { z } from 'zod';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, TRANSACTION_TYPES } from './expense.model.js';

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date (YYYY-MM-DD).');

export const createExpenseSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than 0.'),
  category: z.enum(EXPENSE_CATEGORIES, { errorMap: () => ({ message: 'Select a valid category.' }) }),
  subcategory: z.string().trim().max(80).optional().or(z.literal('')),
  date: dateString,
  paymentMethod: z.enum(PAYMENT_METHODS, { errorMap: () => ({ message: 'Select a valid payment method.' }) }),
  description: z.string().trim().min(2, 'Description must be at least 2 characters.').max(240),
  transactionType: z.enum(TRANSACTION_TYPES, { errorMap: () => ({ message: 'Select Need or Want.' }) }),
  recurring: z.boolean().optional().default(false),
});

export const updateExpenseSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than 0.').optional(),
  category: z.enum(EXPENSE_CATEGORIES, { errorMap: () => ({ message: 'Select a valid category.' }) }).optional(),
  subcategory: z.string().trim().max(80).optional().or(z.literal('')),
  date: dateString.optional(),
  paymentMethod: z.enum(PAYMENT_METHODS, { errorMap: () => ({ message: 'Select a valid payment method.' }) }).optional(),
  description: z.string().trim().min(2, 'Description must be at least 2 characters.').max(240).optional(),
  transactionType: z.enum(TRANSACTION_TYPES, { errorMap: () => ({ message: 'Select Need or Want.' }) }).optional(),
  recurring: z.boolean().optional(),
});

export const listExpenseQuerySchema = z.object({
  search: z.string().trim().optional(),
  category: z.enum(EXPENSE_CATEGORIES).optional().or(z.literal('ALL')),
  transactionType: z.enum(TRANSACTION_TYPES).optional().or(z.literal('ALL')),
  paymentMethod: z.enum(PAYMENT_METHODS).optional().or(z.literal('ALL')),
  from: dateString.optional(),
  to: dateString.optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type ListExpenseQuery = z.infer<typeof listExpenseQuerySchema>;
