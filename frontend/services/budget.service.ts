import { Budget } from '../types';
import { apiRequest } from '../lib/api';

export type BudgetListResponse = {
  status: string;
  budgets: Budget[];
  month: string;
  totalSpent: number;
  count: number;
};

export type BudgetResponse = {
  status: string;
  message?: string;
  budget: Budget;
};

export type BudgetPayload = {
  amount: number;
  month: string;
  category?: Budget['category'];
};

export type BudgetUpdatePayload = {
  amount?: number;
  month?: string;
  category?: Budget['category'] | '';
};

export const budgetService = {
  list(month?: string) {
    const query = month ? `?month=${month}` : '';
    return apiRequest<BudgetListResponse>(`/api/budgets${query}`);
  },

  create(payload: BudgetPayload) {
    return apiRequest<BudgetResponse>('/api/budgets', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: BudgetUpdatePayload) {
    return apiRequest<BudgetResponse>(`/api/budgets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  remove(id: string) {
    return apiRequest<{ status: string; message: string }>(`/api/budgets/${id}`, {
      method: 'DELETE',
    });
  },
};
