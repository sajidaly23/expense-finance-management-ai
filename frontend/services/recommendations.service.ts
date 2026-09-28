import { AIInsight } from '../types';
import { apiRequest } from '../lib/api';

export const recommendationsService = {
  list() {
    return apiRequest<{ status: string; recommendations: AIInsight[]; count: number }>(
      '/api/recommendations'
    );
  },
};
