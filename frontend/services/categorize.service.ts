import { ExpenseCategory } from '../types';
import { apiRequest } from '../lib/api';

export type CategorySuggestion = {
  category: ExpenseCategory;
  confidence: number;
  source: 'keyword' | 'history' | 'default';
};

export type DuplicateExpense = {
  id: string;
  amount: number;
  description: string;
  date: string;
  category: ExpenseCategory;
};

export const categorizeService = {
  suggest(description: string) {
    const params = new URLSearchParams({ description: description.trim() });
    return apiRequest<{ status: string; suggestion: CategorySuggestion }>(
      `/api/categorize/suggest?${params.toString()}`
    );
  },

  duplicates(amount: number, description: string, date: string) {
    const params = new URLSearchParams({
      amount: String(amount),
      description: description.trim(),
      date,
    });
    return apiRequest<{ status: string; duplicates: DuplicateExpense[]; count: number }>(
      `/api/categorize/duplicates?${params.toString()}`
    );
  },
};
