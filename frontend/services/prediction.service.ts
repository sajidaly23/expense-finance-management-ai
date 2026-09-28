import { Prediction } from '../types';
import { apiRequest } from '../lib/api';

export type PredictionResponse = {
  status: string;
  prediction: Prediction | null;
};

export type TrainResponse = {
  status: string;
  message?: string;
  prediction: Prediction;
  train: {
    monthsUsed: number;
    bestModel: Prediction['modelUsed'];
    models: Prediction['modelMetrics'][];
  };
};

export const predictionService = {
  get() {
    return apiRequest<PredictionResponse>('/api/predictions');
  },

  train() {
    return apiRequest<TrainResponse>('/api/predictions/train', {
      method: 'POST',
    });
  },
};
