import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { createDebt, deleteDebt, listDebts, updateDebt } from './debt.service.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const data = await listDebts(req.user!.id);
  res.status(200).json({ status: 'success', ...data });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const debt = await createDebt(req.user!.id, req.body);
  res.status(201).json({ status: 'success', debt });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const debt = await updateDebt(req.user!.id, String(req.params.id), req.body);
  res.status(200).json({ status: 'success', debt });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await deleteDebt(req.user!.id, String(req.params.id));
  res.status(200).json({ status: 'success', message: 'Debt removed.' });
});
