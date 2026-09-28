import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { listAnomalies, scanAnomalies, updateAnomaly } from './anomaly.service.js';

function paramId(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || '';
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await listAnomalies(req.user!.id);
  res.status(200).json({
    status: 'success',
    ...result,
  });
});

export const scan = asyncHandler(async (req: Request, res: Response) => {
  const result = await scanAnomalies(req.user!.id);
  res.status(200).json({
    status: 'success',
    message: 'Anomaly scan complete.',
    ...result,
  });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const anomaly = await updateAnomaly(req.user!.id, paramId(req.params.id), req.body);
  res.status(200).json({
    status: 'success',
    message: 'Anomaly updated.',
    anomaly,
  });
});
