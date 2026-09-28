import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { getSubscriptionsAnalysis } from './subscriptions.service.js';

export const getSubscriptions = asyncHandler(async (req: Request, res: Response) => {
  const data = await getSubscriptionsAnalysis(req.user!.id);
  res.status(200).json({
    status: 'success',
    data,
  });
});
