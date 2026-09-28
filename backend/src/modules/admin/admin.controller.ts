import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { getAdminOverview, listUsers, updateUserRole } from './admin.service.js';

export const overview = asyncHandler(async (_req: Request, res: Response) => {
  const result = await getAdminOverview();
  res.status(200).json({
    status: 'success',
    ...result,
  });
});

export const users = asyncHandler(async (_req: Request, res: Response) => {
  const result = await listUsers();
  res.status(200).json({ status: 'success', ...result });
});

export const setRole = asyncHandler(async (req: Request, res: Response) => {
  const role = req.body.role === 'ADMIN' ? 'ADMIN' : 'USER';
  const user = await updateUserRole(req.user!.id, String(req.params.id), role);
  res.status(200).json({ status: 'success', user });
});
