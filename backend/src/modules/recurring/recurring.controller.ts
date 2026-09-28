import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { listRecurringTemplates, processRecurringForUser } from './recurring.service.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const data = await listRecurringTemplates(req.user!.id);
  res.status(200).json({ status: 'success', ...data });
});

export const process = asyncHandler(async (req: Request, res: Response) => {
  const month = typeof req.body?.month === 'string' ? req.body.month : undefined;
  const result = await processRecurringForUser(req.user!.id, month);
  res.status(200).json({ status: 'success', result });
});
