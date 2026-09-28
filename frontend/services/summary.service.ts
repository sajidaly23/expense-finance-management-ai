import { apiRequest } from '../lib/api';

export type CategoryTotal = {
  category: string;
  amount: number;
};

export type MonthlyPoint = {
  month: string;
  monthKey: string;
  income: number;
  expense: number;
  savings: number;
};

export type BudgetVariance = {
  id: string;
  category: string | null;
  budgeted: number;
  actual: number;
  variance: number;
  variancePercent: number;
  utilization: number;
  status: 'under' | 'on_track' | 'over';
};

export type SummaryResponse = {
  status: string;
  currentMonth: {
    key: string;
    label: string;
    income: number;
    expense: number;
    savings: number;
    savingsRate: number;
    needsTotal: number;
    wantsTotal: number;
    incomeChangePercent: number;
    expenseChangePercent: number;
    byCategory: CategoryTotal[];
  };
  monthly: MonthlyPoint[];
  byCategory: CategoryTotal[];
  budgetVariance: BudgetVariance[];
};

export const summaryService = {
  get(months = 6, month?: string) {
    const params = new URLSearchParams({ months: String(months) });
    if (month) params.set('month', month);
    return apiRequest<SummaryResponse>(`/api/summary?${params.toString()}`);
  },
};
