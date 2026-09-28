import { Anomaly } from '../types';
import { apiRequest } from '../lib/api';

export type AnomalyListResponse = {
  status: string;
  message?: string;
  anomalies: Anomaly[];
  count: number;
};

export type AnomalyResponse = {
  status: string;
  message?: string;
  anomaly: Anomaly;
};

export const anomalyService = {
  list() {
    return apiRequest<AnomalyListResponse>('/api/anomalies');
  },

  scan() {
    return apiRequest<AnomalyListResponse>('/api/anomalies/scan', {
      method: 'POST',
    });
  },

  updateStatus(id: string, status: Anomaly['status']) {
    return apiRequest<AnomalyResponse>(`/api/anomalies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};
