import { apiRequest } from '../lib/api';

export type NetWorthKind = 'asset' | 'liability';

export type NetWorthItem = {
  id: string;
  kind: NetWorthKind;
  name: string;
  category: string;
  value: number;
  asOfDate: string;
  notes?: string;
};

export type NetWorthSummaryResponse = {
  status: string;
  items: NetWorthItem[];
  assets: NetWorthItem[];
  liabilities: NetWorthItem[];
  totalAssets: number;
  totalLiabilities: number;
  debtRemaining: number;
  netWorth: number;
  count: number;
};

export type NetWorthPayload = {
  kind: NetWorthKind;
  name: string;
  category: string;
  value: number;
  asOfDate: string;
  notes?: string;
};

export const networthService = {
  summary() {
    return apiRequest<NetWorthSummaryResponse>('/api/networth');
  },

  create(payload: NetWorthPayload) {
    return apiRequest<{ status: string; item: NetWorthItem }>('/api/networth', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: Partial<NetWorthPayload>) {
    return apiRequest<{ status: string; item: NetWorthItem }>(`/api/networth/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  remove(id: string) {
    return apiRequest<{ status: string; message: string }>(`/api/networth/${id}`, {
      method: 'DELETE',
    });
  },
};
