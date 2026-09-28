import { EmergencyFundPlan, FinancialHealthScore } from '../types';
import { apiRequest } from '../lib/api';

export type HealthScoreResponse = {
  status: string;
  score: FinancialHealthScore;
};

export type EmergencyFundResponse = {
  status: string;
  plan: EmergencyFundPlan;
};

export const scoreService = {
  get() {
    return apiRequest<HealthScoreResponse>('/api/health-score');
  },
  getEmergencyFund() {
    return apiRequest<EmergencyFundResponse>('/api/health-score/emergency-fund');
  },
};
