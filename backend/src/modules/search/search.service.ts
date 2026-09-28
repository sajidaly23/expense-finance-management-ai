import { AppError } from '../../utils/AppError.js';
import { isDatabaseConnected } from '../../config/db.js';
import { Income } from '../income/income.model.js';
import { Expense } from '../expense/expense.model.js';
import { Budget } from '../budget/budget.model.js';
import { SavingsGoal } from '../goal/goal.model.js';

export type SearchResult = {
  type: 'income' | 'expense' | 'budget' | 'goal';
  id: string;
  title: string;
  subtitle: string;
  amount?: number;
  date?: string;
  href: string;
};

function assertDatabase() {
  if (!isDatabaseConnected()) {
    throw new AppError('Database is not connected. Try again in a moment.', 503);
  }
}

export async function globalSearch(userId: string, query: string, limit = 20) {
  assertDatabase();
  const q = query.trim();
  if (q.length < 2) {
    return { results: [] as SearchResult[], count: 0, query: q };
  }

  const regex = { $regex: q, $options: 'i' };
  const cap = Math.min(limit, 50);

  const [incomes, expenses, budgets, goals] = await Promise.all([
    Income.find({ userId, $or: [{ source: regex }, { description: regex }] })
      .sort({ date: -1 })
      .limit(cap)
      .lean(),
    Expense.find({ userId, $or: [{ description: regex }, { category: regex }, { subcategory: regex }] })
      .sort({ date: -1 })
      .limit(cap)
      .lean(),
    Budget.find({ userId, $or: [{ category: regex }, { month: regex }] })
      .sort({ month: -1 })
      .limit(cap)
      .lean(),
    SavingsGoal.find({ userId, name: regex }).sort({ deadline: 1 }).limit(cap).lean(),
  ]);

  const results: SearchResult[] = [
    ...incomes.map((item) => ({
      type: 'income' as const,
      id: String(item._id),
      title: item.source,
      subtitle: `${item.incomeType} · ${item.date.toISOString().slice(0, 10)}`,
      amount: item.amount,
      date: item.date.toISOString().slice(0, 10),
      href: '/income',
    })),
    ...expenses.map((item) => ({
      type: 'expense' as const,
      id: String(item._id),
      title: item.description,
      subtitle: `${item.category} · ${item.date.toISOString().slice(0, 10)}`,
      amount: item.amount,
      date: item.date.toISOString().slice(0, 10),
      href: '/expenses',
    })),
    ...budgets.map((item) => ({
      type: 'budget' as const,
      id: String(item._id),
      title: item.category || 'Overall budget',
      subtitle: `${item.month} · limit Rs. ${item.amount.toLocaleString()}`,
      amount: item.amount,
      href: '/budgets',
    })),
    ...goals.map((item) => ({
      type: 'goal' as const,
      id: String(item._id),
      title: item.name,
      subtitle: `Target Rs. ${item.targetAmount.toLocaleString()} · deadline ${item.deadline.toISOString().slice(0, 10)}`,
      amount: item.targetAmount,
      href: '/savings-goals',
    })),
  ];

  results.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return { results: results.slice(0, cap), count: results.length, query: q };
}
