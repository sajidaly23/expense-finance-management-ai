import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  createNetWorthItem,
  deleteNetWorthItem,
  getNetWorthSummary,
  updateNetWorthItem,
} from './networth.service.js';

export const summary = asyncHandler(async (req: Request, res: Response) => {
  const data = await getNetWorthSummary(req.user!.id);
  res.status(200).json({ status: 'success', ...data });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const item = await createNetWorthItem(req.user!.id, req.body);
  res.status(201).json({ status: 'success', item });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const item = await updateNetWorthItem(req.user!.id, String(req.params.id), req.body);
  res.status(200).json({ status: 'success', item });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await deleteNetWorthItem(req.user!.id, String(req.params.id));
  res.status(200).json({ status: 'success', message: 'Item removed.' });
});
