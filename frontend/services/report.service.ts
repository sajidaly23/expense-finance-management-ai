import { Budget, FinancialHealthScore, Prediction } from '../types';
import { apiDownload, apiRequest } from '../lib/api';

export type ReportIncomeRow = {
  id: string;
  date: string;
  source: string;
  incomeType: string;
  amount: number;
  description?: string;
};

export type ReportExpenseRow = {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: string;
  transactionType: string;
};

export type ReportMonthOption = {
  key: string;
  label: string;
  income: number;
  expense: number;
  savings: number;
};

export type ReportPayload = {
  preparedFor: string;
  period: { key: string; label: string };
  currentMonth: {
    income: number;
    expense: number;
    savings: number;
    savingsRate: number;
    byCategory: { category: string; amount: number }[];
  };
  incomes: ReportIncomeRow[];
  expenses: ReportExpenseRow[];
  prediction: Prediction | null;
  health: FinancialHealthScore | null;
  budgets: Budget[];
  goals: { name: string; remaining: number; requiredMonthly: number; status: string }[];
  executiveSummary: string;
};

export type ReportResponse = {
  status: string;
  report: ReportPayload;
  availableMonths: ReportMonthOption[];
  currentMonthKey: string;
};

function monthQuery(month?: string) {
  return month ? `?month=${encodeURIComponent(month)}` : '';
}

export const reportService = {
  get(month?: string) {
    return apiRequest<ReportResponse>(`/api/reports${monthQuery(month)}`);
  },

  downloadPdf(month?: string) {
    const key = month || 'current';
    return apiDownload(`/api/reports/export.pdf${monthQuery(month)}`, `smartfin-statement-${key}.pdf`);
  },

  downloadExcel(month?: string) {
    const key = month || 'current';
    return apiDownload(`/api/reports/export.xls${monthQuery(month)}`, `smartfin-statement-${key}.xls`);
  },
};
