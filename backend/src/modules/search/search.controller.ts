import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/AppError.js';
import { globalSearch } from './search.service.js';

export const search = asyncHandler(async (req: Request, res: Response) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) {
    throw new AppError('Enter at least 2 characters to search.', 400);
  }
  const limit = req.query.limit ? Number(req.query.limit) : 20;
  const data = await globalSearch(req.user!.id, q, limit);
  res.status(200).json({ status: 'success', ...data });
});
