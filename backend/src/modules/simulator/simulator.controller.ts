import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { runSimulation } from './simulator.service.js';

export const simulate = asyncHandler(async (req: Request, res: Response) => {
  const result = await runSimulation(req.user!.id, req.body);
  res.status(200).json({ status: 'success', result });
});
