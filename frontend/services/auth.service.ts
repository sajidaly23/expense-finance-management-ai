import { User } from '../types';
import { apiRequest, AuthResponse, MeResponse } from '../lib/api';

export const authService = {
  register(payload: { name: string; email: string; password: string }) {
    return apiRequest<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  login(payload: { email: string; password: string }) {
    return apiRequest<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  me() {
    return apiRequest<MeResponse>('/api/auth/me');
  },

  forgotPassword(payload: { email: string }) {
    return apiRequest<{ status: string; message: string; resetUrl?: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  resetPassword(payload: { token: string; password: string; confirmPassword: string }) {
    return apiRequest<AuthResponse>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
