import { apiRequest } from '../lib/api';

export type MlPipelineResult = {
  trained: boolean;
  scanned: boolean;
  messages: string[];
};

export const mlPipelineService = {
  run() {
    return apiRequest<{ status: string; result: MlPipelineResult }>('/api/ml-pipeline/run', {
      method: 'POST',
    });
  },
};
