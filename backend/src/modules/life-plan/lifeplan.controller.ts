import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/AppError.js';
import { lifePlanSchema, runLifePlan } from './lifeplan.service.js';

export const run = asyncHandler(async (req: Request, res: Response) => {
  const parsed = lifePlanSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message || 'Check the life-plan inputs.', 400);
  }
  const plan = await runLifePlan(
    req.user!.id,
    parsed.data.years,
    parsed.data.annualIncomeGrowth,
    parsed.data.annualInflation
  );
  res.status(200).json({ status: 'success', plan });
});
