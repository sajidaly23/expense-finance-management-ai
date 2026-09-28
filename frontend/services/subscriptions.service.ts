import { apiRequest } from '../lib/api';

export type SubscriptionItem = {
  id: string;
  merchant: string;
  category: string;
  amount: number;
  frequency: 'Monthly' | 'Yearly' | 'Weekly' | 'Quarterly';
  monthlyEquivalent: number;
  annualEquivalent: number;
  lastCharged: string;
  nextExpectedDate: string;
  status: 'ACTIVE' | 'INCREASED' | 'PAUSED';
  priceChangeAlert?: string;
};

export type SubscriptionsSummary = {
  subscriptions: SubscriptionItem[];
  totalMonthlyCommitments: number;
  totalAnnualCommitments: number;
  activeCount: number;
  priceIncreaseAlerts: string[];
};

export async function fetchSubscriptions(): Promise<{ data: SubscriptionsSummary }> {
  return apiRequest('/api/subscriptions');
}
