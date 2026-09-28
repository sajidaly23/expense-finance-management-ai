import { z } from 'zod';
import { CONTRIBUTION_SOURCES } from './goal.contribution.model.js';
import { GOAL_PRIORITIES } from './goal.model.js';

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date (YYYY-MM-DD).');

export const createGoalSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(120),
  targetAmount: z.coerce.number().positive('Target amount must be greater than 0.'),
  currentAmount: z.coerce.number().min(0, 'Saved amount cannot be negative.').optional().default(0),
  deadline: dateString,
  priority: z.enum(GOAL_PRIORITIES, { errorMap: () => ({ message: 'Select a valid priority.' }) }).optional().default('MEDIUM'),
});

export const updateGoalSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(120).optional(),
  targetAmount: z.coerce.number().positive('Target amount must be greater than 0.').optional(),
  currentAmount: z.coerce.number().min(0, 'Saved amount cannot be negative.').optional(),
  deadline: dateString.optional(),
  priority: z.enum(GOAL_PRIORITIES, { errorMap: () => ({ message: 'Select a valid priority.' }) }).optional(),
});

export const contributeGoalSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than 0.'),
  source: z.enum(CONTRIBUTION_SOURCES, {
    errorMap: () => ({ message: 'Select a payment source.' }),
  }),
  date: dateString,
  notes: z.string().trim().max(240, 'Notes must be 240 characters or fewer.').optional().default(''),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
export type ContributeGoalInput = z.infer<typeof contributeGoalSchema>;
