import { apiRequest } from '../lib/api';

export type HealthHistoryEntry = {
  id: string;
  monthKey: string;
  overallScore: number;
  status: string;
  componentScores: {
    savingsRate: number;
    budgetAdherence: number;
    expenseStability: number;
    emergencyFund: number;
    goalProgress: number;
  };
  recordedAt: string;
};

export const healthHistoryService = {
  list(limit = 12) {
    const params = new URLSearchParams();
    if (limit) params.set('limit', String(limit));
    const query = params.toString();
    return apiRequest<{ status: string; history: HealthHistoryEntry[]; count: number }>(
      `/api/health-history${query ? `?${query}` : ''}`
    );
  },

  record() {
    return apiRequest<{ status: string; snapshot: HealthHistoryEntry }>('/api/health-history/record', {
      method: 'POST',
    });
  },
};
