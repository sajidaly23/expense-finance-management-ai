import { apiRequest } from '../lib/api';

export type RecurringTemplate = {
  id: string;
  kind: 'income' | 'expense';
  label: string;
  amount: number;
  category?: string;
  incomeType?: string;
  transactionType?: string;
  lastDate: string;
  fingerprint: string;
};

export type ProcessRecurringResult = {
  month: string;
  created: { income: number; expense: number };
  skipped: { income: number; expense: number };
  entries: Array<{ kind: 'income' | 'expense'; label: string; amount: number; date: string }>;
};

export const recurringService = {
  list() {
    return apiRequest<{
      status: string;
      income: RecurringTemplate[];
      expense: RecurringTemplate[];
      count: number;
    }>('/api/recurring');
  },
  process(month?: string) {
    return apiRequest<{ status: string; result: ProcessRecurringResult }>('/api/recurring/process', {
      method: 'POST',
      body: JSON.stringify(month ? { month } : {}),
    });
  },
};
