import { apiRequest } from '../lib/api';

export type AIInsightItem = {
  id: string;
  type: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  metric?: string;
  comparison?: string;
  createdAt: string;
  action?: { label: string; href: string };
};

export async function fetchAIInsights(): Promise<{ status: string; insights: AIInsightItem[]; count: number }> {
  return apiRequest('/api/insights');
}
