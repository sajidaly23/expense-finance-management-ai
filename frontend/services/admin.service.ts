import { AuditLog } from '../types';
import { apiRequest } from '../lib/api';

export type AdminOverviewResponse = {
  status: string;
  users: number;
  transactions: number;
  incomeRecords: number;
  expenseRecords: number;
  predictions: number;
  anomalies: number;
  auditLogs: AuditLog[];
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

export const adminService = {
  overview() {
    return apiRequest<AdminOverviewResponse>('/api/admin/overview');
  },

  listUsers() {
    return apiRequest<{ status: string; users: AdminUser[]; count: number }>('/api/admin/users');
  },

  updateUserRole(id: string, role: 'USER' | 'ADMIN') {
    return apiRequest<{ status: string; user: AdminUser }>(`/api/admin/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },
};
