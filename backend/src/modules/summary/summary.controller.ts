import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/AppError.js';
import { getSummary } from './summary.service.js';
import { summaryQuerySchema } from './summary.validation.js';

export const show = asyncHandler(async (req: Request, res: Response) => {
  const parsed = summaryQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message || 'Invalid filters.', 400);
  }

  const summary = await getSummary(req.user!.id, parsed.data.months, parsed.data.month);
  res.status(200).json({
    status: 'success',
    ...summary,
  });
});
