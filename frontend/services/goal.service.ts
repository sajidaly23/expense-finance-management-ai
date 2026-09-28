import { ContributionSource, SavingsGoal } from '../types';
import { apiRequest } from '../lib/api';

export type GoalListResponse = {
  status: string;
  goals: SavingsGoal[];
  count: number;
};

export type GoalResponse = {
  status: string;
  message?: string;
  goal: SavingsGoal;
};

export type GoalPayload = {
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  priority: SavingsGoal['priority'];
};

export type ContributionPayload = {
  amount: number;
  source: ContributionSource;
  date: string;
  notes?: string;
};

export const goalService = {
  list() {
    return apiRequest<GoalListResponse>('/api/goals');
  },

  create(payload: GoalPayload) {
    return apiRequest<GoalResponse>('/api/goals', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: Partial<GoalPayload>) {
    return apiRequest<GoalResponse>(`/api/goals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  contribute(id: string, payload: ContributionPayload) {
    return apiRequest<GoalResponse>(`/api/goals/${id}/contribute`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  remove(id: string) {
    return apiRequest<{ status: string; message: string }>(`/api/goals/${id}`, {
      method: 'DELETE',
    });
  },
};
