import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { importMissing, reconcileStatement } from './reconcile.service.js';

export const match = asyncHandler(async (req: Request, res: Response) => {
  const result = await reconcileStatement(req.user!.id, req.body.csv);
  res.status(200).json({ status: 'success', ...result });
});

export const importRows = asyncHandler(async (req: Request, res: Response) => {
  const result = await importMissing(req.user!.id, req.body.rows);
  res.status(201).json({ status: 'success', message: `${result.created} expenses added.`, ...result });
});
