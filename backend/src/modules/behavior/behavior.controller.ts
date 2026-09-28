import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { runBehavior } from './behavior.service.js';

export const run = asyncHandler(async (req: Request, res: Response) => {
  const result = await runBehavior(req.user!.id);
  res.status(200).json(result);
});
