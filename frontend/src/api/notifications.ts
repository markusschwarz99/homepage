/**
 * API-Client für Notifications.
 *
 * Backend-Endpoints (siehe backend/routers/notifications.py):
 * - GET    /notifications?limit=&offset=&unread_only=
 * - GET    /notifications/unread-count
 * - PATCH  /notifications/{id}/read
 * - PATCH  /notifications/read-all
 */

import { api } from '../lib/api';
import type {
  Notification,
  NotificationListResponse,
} from '../types';

export async function listNotifications(
  limit = 5,
  offset = 0,
  unreadOnly = false,
): Promise<NotificationListResponse> {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  if (unreadOnly) params.set('unread_only', 'true');
  return api<NotificationListResponse>(`/notifications?${params.toString()}`);
}

export async function getUnreadCount(): Promise<number> {
  const data = await api<{ count: number }>('/notifications/unread-count');
  return data.count;
}

export async function markRead(id: number): Promise<Notification> {
  return api<Notification>(`/notifications/${id}/read`, { method: 'PATCH' });
}

export async function markAllRead(): Promise<{ updated: number }> {
  return api<{ updated: number }>('/notifications/read-all', { method: 'PATCH' });
}
