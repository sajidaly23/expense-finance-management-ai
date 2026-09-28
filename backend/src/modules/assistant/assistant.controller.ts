import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  askAssistant,
  clearChatMessages,
  getAssistantStatus,
  listChatMessages,
} from './assistant.service.js';

export const status = asyncHandler(async (_req: Request, res: Response) => {
  const result = await getAssistantStatus();
  res.status(200).json({
    status: 'success',
    ...result,
  });
});

export const messages = asyncHandler(async (req: Request, res: Response) => {
  const items = await listChatMessages(req.user!.id);
  res.status(200).json({
    status: 'success',
    messages: items,
    count: items.length,
  });
});

export const clear = asyncHandler(async (req: Request, res: Response) => {
  await clearChatMessages(req.user!.id);
  res.status(200).json({
    status: 'success',
    message: 'Assistant chat cleared.',
  });
});

export const ask = asyncHandler(async (req: Request, res: Response) => {
  const result = await askAssistant(req.user!.id, req.body);
  res.status(200).json({
    status: 'success',
    ...result,
  });
});
