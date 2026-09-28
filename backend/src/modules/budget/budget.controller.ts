import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/AppError.js';
import { createBudget, deleteBudget, getBudget, listBudgets, updateBudget } from './budget.service.js';
import { listBudgetQuerySchema } from './budget.validation.js';

function paramId(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || '';
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const parsed = listBudgetQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message || 'Invalid filters.', 400);
  }
  const result = await listBudgets(req.user!.id, parsed.data);
  res.status(200).json({
    status: 'success',
    ...result,
  });
});

export const show = asyncHandler(async (req: Request, res: Response) => {
  const budget = await getBudget(req.user!.id, paramId(req.params.id));
  res.status(200).json({
    status: 'success',
    budget,
  });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const budget = await createBudget(req.user!.id, req.body);
  res.status(201).json({
    status: 'success',
    message: 'Budget saved.',
    budget,
  });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const budget = await updateBudget(req.user!.id, paramId(req.params.id), req.body);
  res.status(200).json({
    status: 'success',
    message: 'Budget updated.',
    budget,
  });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await deleteBudget(req.user!.id, paramId(req.params.id));
  res.status(200).json({
    status: 'success',
    message: 'Budget deleted.',
  });
});
