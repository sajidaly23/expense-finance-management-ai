import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { runMlPipelineForUser } from './ml-pipeline.service.js';

export const run = asyncHandler(async (req: Request, res: Response) => {
  const result = await runMlPipelineForUser(req.user!.id);
  res.status(200).json({ status: 'success', result });
});
