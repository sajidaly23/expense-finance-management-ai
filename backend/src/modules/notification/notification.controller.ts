import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from './notification.service.js';

function paramId(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || '';
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await listNotifications(req.user!.id);
  res.status(200).json({
    status: 'success',
    ...result,
  });
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const notification = await markNotificationRead(req.user!.id, paramId(req.params.id));
  res.status(200).json({
    status: 'success',
    notification,
  });
});

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  const result = await markAllNotificationsRead(req.user!.id);
  res.status(200).json({
    status: 'success',
    message: 'All notifications marked as read.',
    ...result,
  });
});
