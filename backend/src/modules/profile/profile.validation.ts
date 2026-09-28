import { z } from 'zod';
import { FINANCIAL_GOALS, RISK_PREFERENCES } from '../auth/user.model.js';

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(80),
  occupation: z.string().trim().max(80, 'Occupation is too long.').optional().default(''),
  age: z.coerce.number().int('Age must be a whole number.').min(16, 'Age must be at least 16.').max(100, 'Age must be 100 or less.'),
  monthlyIncome: z.coerce.number().min(0, 'Monthly income cannot be negative.'),
  familySize: z.coerce.number().int().min(1, 'Family size must be at least 1.').max(20, 'Family size must be 20 or less.'),
  financialGoal: z.enum(FINANCIAL_GOALS, { errorMap: () => ({ message: 'Select a valid financial goal.' }) }),
  riskPreference: z.enum(RISK_PREFERENCES, { errorMap: () => ({ message: 'Select a valid risk preference.' }) }),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
