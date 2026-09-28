import { UserProfile } from '../types';
import { apiRequest } from '../lib/api';

export type ProfileResponse = {
  status: string;
  message?: string;
  profile: UserProfile;
};

export type ProfilePayload = {
  name: string;
  occupation: string;
  age: number;
  monthlyIncome: number;
  familySize: number;
  financialGoal: NonNullable<UserProfile['financialGoal']>;
  riskPreference: NonNullable<UserProfile['riskPreference']>;
};

export const profileService = {
  get() {
    return apiRequest<ProfileResponse>('/api/profile');
  },

  update(payload: ProfilePayload) {
    return apiRequest<ProfileResponse>('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  exportData() {
    return apiRequest<{ status: string; data: Record<string, unknown> }>('/api/profile/export');
  },

  deleteAccount(password: string) {
    return apiRequest<{ status: string; message: string }>('/api/profile/account', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    });
  },
};
