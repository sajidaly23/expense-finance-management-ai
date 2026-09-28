import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/AppError.js';
import { getProfile, updateProfile } from './profile.service.js';
import { deleteUserAccount, exportUserData } from './profile.data.service.js';

export const show = asyncHandler(async (req: Request, res: Response) => {
  const profile = await getProfile(req.user!.id);
  res.status(200).json({
    status: 'success',
    profile,
  });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const profile = await updateProfile(req.user!.id, req.body);
  res.status(200).json({
    status: 'success',
    message: 'Financial profile saved.',
    profile,
  });
});

export const exportData = asyncHandler(async (req: Request, res: Response) => {
  const data = await exportUserData(req.user!.id);
  res.status(200).json({ status: 'success', data });
});

export const removeAccount = asyncHandler(async (req: Request, res: Response) => {
  const password = String(req.body?.password || '');
  if (!password) throw new AppError('Password is required.', 400);
  await deleteUserAccount(req.user!.id, password);
  res.status(200).json({ status: 'success', message: 'Account and all data deleted.' });
});
