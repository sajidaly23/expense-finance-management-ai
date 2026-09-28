import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { findDuplicateExpenses, suggestCategory } from './categorize.service.js';

export const suggest = asyncHandler(async (req: Request, res: Response) => {
  const description = String(req.query.description || '');
  const result = await suggestCategory(req.user!.id, description);
  res.status(200).json({ status: 'success', suggestion: result });
});

export const duplicates = asyncHandler(async (req: Request, res: Response) => {
  const amount = Number(req.query.amount);
  const description = String(req.query.description || '');
  const date = String(req.query.date || '');
  const matches = await findDuplicateExpenses(req.user!.id, amount, description, date);
  res.status(200).json({ status: 'success', duplicates: matches, count: matches.length });
});
