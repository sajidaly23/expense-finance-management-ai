import { apiRequest } from '../lib/api';

export type Debt = {
  id: string;
  name: string;
  principal: number;
  interestRate: number;
  tenureMonths: number;
  emiAmount: number;
  paidMonths: number;
  remainingMonths: number;
  remainingBalance: number;
  totalInterest: number;
  totalPaid: number;
  progressPercent: number;
  startDate: string;
  notes?: string;
};

export type DebtListResponse = {
  status: string;
  debts: Debt[];
  count: number;
  totalRemaining: number;
  totalMonthlyEmi: number;
};

export type DebtPayload = {
  name: string;
  principal: number;
  interestRate: number;
  tenureMonths: number;
  paidMonths?: number;
  startDate: string;
  notes?: string;
};

export const debtService = {
  list() {
    return apiRequest<DebtListResponse>('/api/debts');
  },

  create(payload: DebtPayload) {
    return apiRequest<{ status: string; debt: Debt }>('/api/debts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: Partial<DebtPayload>) {
    return apiRequest<{ status: string; debt: Debt }>(`/api/debts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  remove(id: string) {
    return apiRequest<{ status: string; message: string }>(`/api/debts/${id}`, {
      method: 'DELETE',
    });
  },
};
