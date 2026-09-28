import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { estimateTax } from './tax.service.js';

export const show = asyncHandler(async (req: Request, res: Response) => {
  const estimate = await estimateTax(req.user!.id);
  res.status(200).json({ status: 'success', estimate });
});
