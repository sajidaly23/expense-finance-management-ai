import { Income } from '../types';
import { apiRequest } from '../lib/api';

export type IncomeListResponse = {
  status: string;
  incomes: Income[];
  count: number;
  totalAmount: number;
};

export type IncomeResponse = {
  status: string;
  message?: string;
  income: Income;
};

export type IncomePayload = {
  amount: number;
  source: string;
  date: string;
  incomeType: Income['incomeType'];
  description?: string;
  recurring: boolean;
};

export type IncomeListFilters = {
  search?: string;
  incomeType?: Income['incomeType'] | 'ALL';
  from?: string;
  to?: string;
};

export const incomeService = {
  list(filters: IncomeListFilters = {}) {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.incomeType && filters.incomeType !== 'ALL') params.set('incomeType', filters.incomeType);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    const query = params.toString();
    return apiRequest<IncomeListResponse>(`/api/income${query ? `?${query}` : ''}`);
  },

  get(id: string) {
    return apiRequest<IncomeResponse>(`/api/income/${id}`);
  },

  create(payload: IncomePayload) {
    return apiRequest<IncomeResponse>('/api/income', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: Partial<IncomePayload>) {
    return apiRequest<IncomeResponse>(`/api/income/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  remove(id: string) {
    return apiRequest<{ status: string; message: string }>(`/api/income/${id}`, {
      method: 'DELETE',
    });
  },
};
