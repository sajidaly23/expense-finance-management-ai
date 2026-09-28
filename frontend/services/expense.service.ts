import { Expense } from '../types';
import { apiRequest } from '../lib/api';

export type ExpenseListResponse = {
  status: string;
  expenses: Expense[];
  count: number;
  totalAmount: number;
  needsTotal: number;
  wantsTotal: number;
};

export type ExpenseResponse = {
  status: string;
  message?: string;
  expense: Expense;
};

export type ExpensePayload = {
  amount: number;
  category: Expense['category'];
  subcategory?: string;
  date: string;
  paymentMethod: Expense['paymentMethod'];
  description: string;
  transactionType: Expense['transactionType'];
  recurring: boolean;
};

export type ExpenseListFilters = {
  search?: string;
  category?: Expense['category'] | 'ALL';
  transactionType?: Expense['transactionType'] | 'ALL';
  paymentMethod?: Expense['paymentMethod'] | 'ALL';
  from?: string;
  to?: string;
};

export const expenseService = {
  list(filters: ExpenseListFilters = {}) {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.category && filters.category !== 'ALL') params.set('category', filters.category);
    if (filters.transactionType && filters.transactionType !== 'ALL') {
      params.set('transactionType', filters.transactionType);
    }
    if (filters.paymentMethod && filters.paymentMethod !== 'ALL') {
      params.set('paymentMethod', filters.paymentMethod);
    }
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    const query = params.toString();
    return apiRequest<ExpenseListResponse>(`/api/expenses${query ? `?${query}` : ''}`);
  },

  get(id: string) {
    return apiRequest<ExpenseResponse>(`/api/expenses/${id}`);
  },

  create(payload: ExpensePayload) {
    return apiRequest<ExpenseResponse>('/api/expenses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: Partial<ExpensePayload>) {
    return apiRequest<ExpenseResponse>(`/api/expenses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  remove(id: string) {
    return apiRequest<{ status: string; message: string }>(`/api/expenses/${id}`, {
      method: 'DELETE',
    });
  },
};
