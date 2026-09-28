import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { getLatestPrediction, trainAndPredict } from './prediction.service.js';

export const show = asyncHandler(async (req: Request, res: Response) => {
  const prediction = await getLatestPrediction(req.user!.id);
  res.status(200).json({
    status: 'success',
    prediction,
  });
});

export const train = asyncHandler(async (req: Request, res: Response) => {
  const result = await trainAndPredict(req.user!.id);
  res.status(200).json({
    status: 'success',
    message: 'Models trained and next-month forecast saved.',
    ...result,
  });
});
