import mongoose from 'mongoose';
import { AppError } from '../../utils/AppError.js';
import { isDatabaseConnected } from '../../config/db.js';
import { Income } from '../income/income.model.js';
import { Expense, EXPENSE_CATEGORIES } from '../expense/expense.model.js';
import { getSummary } from '../summary/summary.service.js';
import { listBudgets } from '../budget/budget.service.js';
import { DateRange, buildMonthRange, monthLabel } from './date-parser.js';

function assertDatabase() {
  if (!isDatabaseConnected()) {
    throw new AppError('Database is not connected. Try again in a moment.', 503);
  }
}

function assertUserId(userId: string) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError('User not found.', 404);
  }
}

export type MonthTotals = {
  monthKey: string;
  label: string;
  income: number;
  expense: number;
  savings: number;
  savingsRate: number;
  needsTotal: number;
  wantsTotal: number;
  byCategory: { category: string; amount: number }[];
};

export type SalaryResult = {
  total: number;
  count: number;
  label: string;
};

export type LargestExpenseResult = {
  amount: number;
  category: string;
  description: string;
  date: string;
  label: string;
} | null;

export type RecentTransactionItem = {
  id: string;
  type: 'EXPENSE' | 'INCOME';
  amount: number;
  category: string;
  description: string;
  date: string;
};

/**
 * Category aliases dictionary to map common user natural phrases to official EXPENSE_CATEGORIES
 */
const CATEGORY_ALIASES: Record<string, string> = {
  food: 'Food',
  dining: 'Food',
  restaurant: 'Food',
  restaurants: 'Food',
  groceries: 'Food',
  grocery: 'Food',
  lunch: 'Food',
  dinner: 'Food',
  breakfast: 'Food',
  meal: 'Food',
  meals: 'Food',
  snacks: 'Food',
  cafe: 'Food',
  coffee: 'Food',

  transport: 'Transport',
  transportation: 'Transport',
  fuel: 'Transport',
  petrol: 'Transport',
  gas: 'Transport',
  diesel: 'Transport',
  uber: 'Transport',
  careem: 'Transport',
  taxi: 'Transport',
  cab: 'Transport',
  bus: 'Transport',
  train: 'Transport',
  fare: 'Transport',
  commute: 'Transport',

  bills: 'Bills',
  bill: 'Bills',
  wifi: 'Bills',
  internet: 'Bills',
  phone: 'Bills',
  mobile: 'Bills',

  utility: 'Utilities',
  utilities: 'Utilities',
  electricity: 'Utilities',
  water: 'Utilities',
  power: 'Utilities',

  rent: 'Rent',
  housing: 'Rent',
  hostel: 'Rent',
  apartment: 'Rent',

  education: 'Education',
  tuition: 'Education',
  school: 'Education',
  college: 'Education',
  university: 'Education',
  books: 'Education',
  course: 'Education',
  fees: 'Education',

  health: 'Healthcare',
  healthcare: 'Healthcare',
  medical: 'Healthcare',
  medicine: 'Healthcare',
  medicines: 'Healthcare',
  doctor: 'Healthcare',
  hospital: 'Healthcare',
  pharmacy: 'Healthcare',
  clinic: 'Healthcare',

  shopping: 'Shopping',
  clothes: 'Shopping',
  clothing: 'Shopping',
  shoes: 'Shopping',
  mall: 'Shopping',

  entertainment: 'Entertainment',
  movie: 'Entertainment',
  movies: 'Entertainment',
  cinema: 'Entertainment',
  games: 'Entertainment',
  gaming: 'Entertainment',
  netflix: 'Entertainment',
  fun: 'Entertainment',

  travel: 'Travel',
  vacation: 'Travel',
  trip: 'Travel',
  hotel: 'Travel',
  flight: 'Travel',

  other: 'Other',
  misc: 'Other',
  miscellaneous: 'Other',
};

export function matchedCategory(question: string): string | undefined {
  const q = question.toLowerCase();

  // 1. Direct match with official categories
  for (const cat of EXPENSE_CATEGORIES) {
    const regex = new RegExp(`\\b${cat.toLowerCase()}\\b`, 'i');
    if (regex.test(q)) return cat;
  }

  // 2. Alias match
  for (const [alias, officialCat] of Object.entries(CATEGORY_ALIASES)) {
    const regex = new RegExp(`\\b${alias}\\b`, 'i');
    if (regex.test(q)) return officialCat;
  }

  return undefined;
}

function toMonthTotals(monthKey: string, summary: Awaited<ReturnType<typeof getSummary>>): MonthTotals {
  const m = summary.currentMonth;
  return {
    monthKey,
    label: monthLabel(monthKey),
    income: m.income,
    expense: m.expense,
    savings: m.savings,
    savingsRate: m.savingsRate,
    needsTotal: m.needsTotal,
    wantsTotal: m.wantsTotal,
    byCategory: m.byCategory,
  };
}

export async function getMonthTotals(userId: string, monthKey: string): Promise<MonthTotals> {
  assertDatabase();
  assertUserId(userId);
  const summary = await getSummary(userId, 1, monthKey);
  return toMonthTotals(monthKey, summary);
}

/**
 * Calculates totals for ANY date range (days, weeks, months, quarters, years, custom)
 */
export async function getRangeTotals(userId: string, range: DateRange): Promise<MonthTotals> {
  assertDatabase();
  assertUserId(userId);

  const userObjectId = new mongoose.Types.ObjectId(userId);

  const [incomeRows, expenseRows] = await Promise.all([
    Income.aggregate([
      {
        $match: {
          userId: userObjectId,
          date: { $gte: range.start, $lt: range.end },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]),
    Expense.aggregate([
      {
        $match: {
          userId: userObjectId,
          date: { $gte: range.start, $lt: range.end },
        },
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          needsTotal: {
            $sum: {
              $cond: [{ $eq: ['$transactionType', 'NEED'] }, '$amount', 0],
            },
          },
          wantsTotal: {
            $sum: {
              $cond: [{ $eq: ['$transactionType', 'WANT'] }, '$amount', 0],
            },
          },
        },
      },
    ]),
  ]);

  const totalIncome = incomeRows[0]?.total || 0;
  let totalExpense = 0;
  let needsTotal = 0;
  let wantsTotal = 0;

  const byCategory = expenseRows.map((row) => {
    const amount = row.total || 0;
    totalExpense += amount;
    needsTotal += row.needsTotal || 0;
    wantsTotal += row.wantsTotal || 0;
    return {
      category: row._id || 'Other',
      amount,
    };
  }).sort((a, b) => b.amount - a.amount);

  const savings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Number(((savings / totalIncome) * 100).toFixed(1)) : 0;

  return {
    monthKey: range.monthKey,
    label: range.label,
    income: totalIncome,
    expense: totalExpense,
    savings,
    savingsRate,
    needsTotal,
    wantsTotal,
    byCategory,
  };
}

export async function getTotalIncome(userId: string, range: DateRange): Promise<number> {
  assertDatabase();
  assertUserId(userId);
  const rows = await Income.find({
    userId,
    date: { $gte: range.start, $lt: range.end },
  })
    .select('amount')
    .lean();
  return rows.reduce((sum, row) => sum + row.amount, 0);
}

export async function getTotalExpenses(userId: string, range: DateRange): Promise<number> {
  assertDatabase();
  assertUserId(userId);
  const rows = await Expense.find({
    userId,
    date: { $gte: range.start, $lt: range.end },
  })
    .select('amount')
    .lean();
  return rows.reduce((sum, row) => sum + row.amount, 0);
}

export async function getNetSavings(userId: string, range: DateRange): Promise<{ savings: number; income: number; expense: number; savingsRate: number }> {
  const [income, expense] = await Promise.all([
    getTotalIncome(userId, range),
    getTotalExpenses(userId, range),
  ]);
  const savings = income - expense;
  const savingsRate = income > 0 ? Number(((savings / income) * 100).toFixed(1)) : 0;
  return { income, expense, savings, savingsRate };
}

export async function getCategoryExpenses(
  userId: string,
  category: string,
  range: DateRange
): Promise<number> {
  assertDatabase();
  assertUserId(userId);
  const rows = await Expense.find({
    userId,
    category: { $regex: new RegExp(`^${category}$`, 'i') },
    date: { $gte: range.start, $lt: range.end },
  })
    .select('amount')
    .lean();
  return rows.reduce((sum, row) => sum + row.amount, 0);
}

export async function getTopExpenseCategories(
  userId: string,
  range: DateRange,
  limit = 5
): Promise<{ category: string; amount: number }[]> {
  const totals = await getRangeTotals(userId, range);
  return totals.byCategory.slice(0, limit);
}

export async function getLargestExpense(userId: string, range: DateRange): Promise<LargestExpenseResult> {
  assertDatabase();
  assertUserId(userId);
  const row = await Expense.findOne({
    userId,
    date: { $gte: range.start, $lt: range.end },
  })
    .sort({ amount: -1 })
    .select('amount category description date')
    .lean();

  if (!row) return null;

  return {
    amount: row.amount,
    category: row.category,
    description: row.description || '',
    date: row.date ? row.date.toISOString().slice(0, 10) : '',
    label: range.label,
  };
}

export async function getLargestExpenses(
  userId: string,
  range: DateRange,
  limit = 5
): Promise<Array<{ amount: number; category: string; description: string; date: string }>> {
  assertDatabase();
  assertUserId(userId);
  const rows = await Expense.find({
    userId,
    date: { $gte: range.start, $lt: range.end },
  })
    .sort({ amount: -1 })
    .limit(limit)
    .select('amount category description date')
    .lean();

  return rows.map((row) => ({
    amount: row.amount,
    category: row.category,
    description: row.description || '',
    date: row.date ? row.date.toISOString().slice(0, 10) : '',
  }));
}

export async function getRecentTransactions(
  userId: string,
  range?: DateRange,
  limit = 5
): Promise<RecentTransactionItem[]> {
  assertDatabase();
  assertUserId(userId);

  const expenseFilter: any = { userId };
  const incomeFilter: any = { userId };

  if (range) {
    expenseFilter.date = { $gte: range.start, $lt: range.end };
    incomeFilter.date = { $gte: range.start, $lt: range.end };
  }

  const [expenses, incomes] = await Promise.all([
    Expense.find(expenseFilter).sort({ date: -1 }).limit(limit).lean(),
    Income.find(incomeFilter).sort({ date: -1 }).limit(limit).lean(),
  ]);

  const items: RecentTransactionItem[] = [
    ...expenses.map((e: any) => ({
      id: String(e._id),
      type: 'EXPENSE' as const,
      amount: e.amount,
      category: e.category,
      description: e.description || e.category,
      date: e.date ? new Date(e.date).toISOString().slice(0, 10) : '',
    })),
    ...incomes.map((i: any) => ({
      id: String(i._id),
      type: 'INCOME' as const,
      amount: i.amount,
      category: i.source || i.incomeType || 'Income',
      description: i.description || i.source || 'Income Received',
      date: i.date ? new Date(i.date).toISOString().slice(0, 10) : '',
    })),
  ];

  return items
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}

export async function getUserNetBalance(userId: string): Promise<{ income: number; expense: number; balance: number }> {
  assertDatabase();
  assertUserId(userId);
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const [incomeAgg, expenseAgg] = await Promise.all([
    Income.aggregate([
      { $match: { userId: userObjectId } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Expense.aggregate([
      { $match: { userId: userObjectId } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  const income = incomeAgg[0]?.total || 0;
  const expense = expenseAgg[0]?.total || 0;
  return {
    income,
    expense,
    balance: income - expense,
  };
}

export async function getSalaryIncome(userId: string, range: DateRange): Promise<SalaryResult> {
  assertDatabase();
  assertUserId(userId);
  const rows = await Income.find({
    userId,
    incomeType: { $regex: /^salary$/i },
    date: { $gte: range.start, $lt: range.end },
  })
    .select('amount')
    .lean();

  return {
    total: rows.reduce((sum, row) => sum + row.amount, 0),
    count: rows.length,
    label: range.label,
  };
}

export async function getSalaryTransactionCount(userId: string, range: DateRange): Promise<number> {
  assertDatabase();
  assertUserId(userId);
  return Income.countDocuments({
    userId,
    incomeType: { $regex: /^salary$/i },
    date: { $gte: range.start, $lt: range.end },
  });
}

export async function getIncomeTransactionCount(userId: string, range: DateRange): Promise<number> {
  assertDatabase();
  assertUserId(userId);
  return Income.countDocuments({
    userId,
    date: { $gte: range.start, $lt: range.end },
  });
}

export async function getExpenseTransactionCount(userId: string, range: DateRange): Promise<number> {
  assertDatabase();
  assertUserId(userId);
  return Expense.countDocuments({
    userId,
    date: { $gte: range.start, $lt: range.end },
  });
}

export async function compareMonths(
  userId: string,
  monthKeyA: string,
  monthKeyB: string
): Promise<{ a: MonthTotals; b: MonthTotals; expenseDelta: number; incomeDelta: number }> {
  const [a, b] = await Promise.all([
    getRangeTotals(userId, buildMonthRange(monthKeyA)),
    getRangeTotals(userId, buildMonthRange(monthKeyB)),
  ]);
  return {
    a,
    b,
    expenseDelta: b.expense - a.expense,
    incomeDelta: b.income - a.income,
  };
}

export async function compareTwoRanges(
  userId: string,
  rangeA: DateRange,
  rangeB: DateRange
): Promise<{ a: MonthTotals; b: MonthTotals; expenseDelta: number; incomeDelta: number }> {
  const [a, b] = await Promise.all([
    getRangeTotals(userId, rangeA),
    getRangeTotals(userId, rangeB),
  ]);
  return {
    a,
    b,
    expenseDelta: b.expense - a.expense,
    incomeDelta: b.income - a.income,
  };
}

export async function getBudgetStatus(userId: string, monthKey: string) {
  assertDatabase();
  assertUserId(userId);
  const result = await listBudgets(userId, { month: monthKey });
  if (result.budgets.length > 0) {
    return result.budgets;
  }
  // Fallback: check general or recent budgets if none specifically for that month
  const fallback = await listBudgets(userId, {});
  return fallback.budgets;
}

export { buildMonthRange, EXPENSE_CATEGORIES };
