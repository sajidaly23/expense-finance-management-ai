import { apiRequest } from '../lib/api';

export type SearchResult = {
  type: 'income' | 'expense' | 'budget' | 'goal';
  id: string;
  title: string;
  subtitle: string;
  amount?: number;
  date?: string;
  href: string;
};

export type SearchResponse = {
  status: string;
  results: SearchResult[];
  count: number;
  query: string;
};

export const searchService = {
  search(q: string, limit = 20) {
    const params = new URLSearchParams({ q: q.trim() });
    if (limit) params.set('limit', String(limit));
    return apiRequest<SearchResponse>(`/api/search?${params.toString()}`);
  },
};
