import { NotificationItem } from '../types';
import { apiRequest } from '../lib/api';

export type NotificationListResponse = {
  status: string;
  notifications: NotificationItem[];
  unreadCount: number;
  count: number;
};

export type NotificationResponse = {
  status: string;
  notification: NotificationItem;
};

export const notificationService = {
  list() {
    return apiRequest<NotificationListResponse>('/api/notifications');
  },

  markRead(id: string) {
    return apiRequest<NotificationResponse>(`/api/notifications/${id}/read`, {
      method: 'PATCH',
    });
  },

  markAllRead() {
    return apiRequest<NotificationListResponse>('/api/notifications/read-all', {
      method: 'PATCH',
    });
  },
};
