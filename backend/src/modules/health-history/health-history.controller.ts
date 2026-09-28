import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { listHealthHistory, recordHealthSnapshot } from './health-history.service.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 12;
  const data = await listHealthHistory(req.user!.id, limit);
  res.status(200).json({ status: 'success', ...data });
});

export const record = asyncHandler(async (req: Request, res: Response) => {
  const snapshot = await recordHealthSnapshot(req.user!.id);
  res.status(200).json({ status: 'success', snapshot });
});
