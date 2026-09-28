import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  getCurrentUser,
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPassword,
} from './auth.service.js';
import { ForgotPasswordInput, LoginInput, RegisterInput, ResetPasswordInput } from './auth.validation.js';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await registerUser(req.body as RegisterInput);
  res.status(201).json({
    status: 'success',
    message: 'Account created.',
    ...result,
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await loginUser(req.body as LoginInput);
  res.status(200).json({
    status: 'success',
    message: 'Signed in.',
    ...result,
  });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await getCurrentUser(req.user!.id);
  res.status(200).json({
    status: 'success',
    user,
  });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const result = await requestPasswordReset(req.body as ForgotPasswordInput);
  res.status(200).json({
    status: 'success',
    ...result,
  });
});

export const resetPasswordHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await resetPassword(req.body as ResetPasswordInput);
  res.status(200).json({
    status: 'success',
    message: 'Password updated.',
    ...result,
  });
});
