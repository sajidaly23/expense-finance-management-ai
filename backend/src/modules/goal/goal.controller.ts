import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { contributeToGoal, createGoal, deleteGoal, getGoal, listGoals, updateGoal } from './goal.service.js';

function paramId(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || '';
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await listGoals(req.user!.id);
  res.status(200).json({
    status: 'success',
    ...result,
  });
});

export const show = asyncHandler(async (req: Request, res: Response) => {
  const goal = await getGoal(req.user!.id, paramId(req.params.id));
  res.status(200).json({
    status: 'success',
    goal,
  });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const goal = await createGoal(req.user!.id, req.body);
  res.status(201).json({
    status: 'success',
    message: 'Savings goal saved.',
    goal,
  });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const goal = await updateGoal(req.user!.id, paramId(req.params.id), req.body);
  res.status(200).json({
    status: 'success',
    message: 'Savings goal updated.',
    goal,
  });
});

export const contribute = asyncHandler(async (req: Request, res: Response) => {
  const goal = await contributeToGoal(req.user!.id, paramId(req.params.id), req.body);
  res.status(201).json({
    status: 'success',
    message: 'Contribution recorded.',
    goal,
  });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await deleteGoal(req.user!.id, paramId(req.params.id));
  res.status(200).json({
    status: 'success',
    message: 'Savings goal deleted.',
  });
});
