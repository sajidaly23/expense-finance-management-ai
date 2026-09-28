import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { getRecommendations } from './recommendations.service.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const data = await getRecommendations(req.user!.id);
  res.status(200).json({ status: 'success', ...data });
});
