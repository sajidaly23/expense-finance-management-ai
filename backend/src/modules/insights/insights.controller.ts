import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { generateAIInsights } from './insights.service.js';

export const getInsights = asyncHandler(async (req: Request, res: Response) => {
  const insights = await generateAIInsights(req.user!.id);
  res.status(200).json({
    status: 'success',
    insights,
    count: insights.length,
  });
});
