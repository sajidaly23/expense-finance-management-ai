import { AppError } from '../../utils/AppError.js';
import { isDatabaseConnected } from '../../config/db.js';
import { Income, IIncome } from '../income/income.model.js';
import { Expense, IExpense } from '../expense/expense.model.js';
import { User } from '../auth/user.model.js';

export type RecurringTemplate = {
  id: string;
  kind: 'income' | 'expense';
  label: string;
  amount: number;
  category?: string;
  incomeType?: IIncome['incomeType'];
  transactionType?: IExpense['transactionType'];
  lastDate: string;
  fingerprint: string;
};

export type ProcessRecurringResult = {
  month: string;
  created: { income: number; expense: number };
  skipped: { income: number; expense: number };
  entries: Array<{ kind: 'income' | 'expense'; label: string; amount: number; date: string }>;
};

function assertDatabase() {
  if (!isDatabaseConnected()) {
    throw new AppError('Database is not connected. Try again in a moment.', 503);
  }
}

function monthKeyFromDate(value: Date) {
  return value.toISOString().slice(0, 7);
}

function startOfMonth(monthKey: string) {
  return new Date(`${monthKey}-01T00:00:00.000Z`);
}

function startOfNextMonth(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(Date.UTC(year, month, 1));
}

function entryDateForMonth(templateDate: Date, monthKey: string) {
  const day = templateDate.getUTCDate();
  const [year, month] = monthKey.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return new Date(Date.UTC(year, month - 1, Math.min(day, lastDay)));
}

function incomeFingerprint(item: Pick<IIncome, 'source' | 'amount' | 'incomeType'>) {
  return `income:${item.source}|${item.amount}|${item.incomeType}`;
}

function expenseFingerprint(item: Pick<IExpense, 'description' | 'amount' | 'category' | 'transactionType'>) {
  return `expense:${item.description}|${item.amount}|${item.category}|${item.transactionType}`;
}

function buildIncomeTemplates(items: IIncome[]): RecurringTemplate[] {
  const latest = new Map<string, IIncome>();
  for (const item of items) {
    const key = incomeFingerprint(item);
    const existing = latest.get(key);
    if (!existing || item.date > existing.date) {
      latest.set(key, item);
    }
  }
  return [...latest.values()].map((item) => ({
    id: String(item._id),
    kind: 'income' as const,
    label: item.source,
    amount: item.amount,
    incomeType: item.incomeType,
    lastDate: item.date.toISOString().slice(0, 10),
    fingerprint: incomeFingerprint(item),
  }));
}

function buildExpenseTemplates(items: IExpense[]): RecurringTemplate[] {
  const latest = new Map<string, IExpense>();
  for (const item of items) {
    const key = expenseFingerprint(item);
    const existing = latest.get(key);
    if (!existing || item.date > existing.date) {
      latest.set(key, item);
    }
  }
  return [...latest.values()].map((item) => ({
    id: String(item._id),
    kind: 'expense' as const,
    label: item.description,
    amount: item.amount,
    category: item.category,
    transactionType: item.transactionType,
    lastDate: item.date.toISOString().slice(0, 10),
    fingerprint: expenseFingerprint(item),
  }));
}

export async function listRecurringTemplates(userId: string) {
  assertDatabase();

  const [incomes, expenses] = await Promise.all([
    Income.find({ userId, recurring: true }).sort({ date: -1 }),
    Expense.find({ userId, recurring: true }).sort({ date: -1 }),
  ]);

  const incomeTemplates = buildIncomeTemplates(incomes);
  const expenseTemplates = buildExpenseTemplates(expenses);

  return {
    income: incomeTemplates,
    expense: expenseTemplates,
    count: incomeTemplates.length + expenseTemplates.length,
  };
}

export async function processRecurringForUser(
  userId: string,
  monthKey = monthKeyFromDate(new Date())
): Promise<ProcessRecurringResult> {
  assertDatabase();

  const [incomes, expenses] = await Promise.all([
    Income.find({ userId, recurring: true }).sort({ date: -1 }),
    Expense.find({ userId, recurring: true }).sort({ date: -1 }),
  ]);

  const incomeTemplates = buildIncomeTemplates(incomes);
  const expenseTemplates = buildExpenseTemplates(expenses);

  const rangeStart = startOfMonth(monthKey);
  const rangeEnd = startOfNextMonth(monthKey);

  const [monthIncomes, monthExpenses] = await Promise.all([
    Income.find({ userId, date: { $gte: rangeStart, $lt: rangeEnd } }).lean(),
    Expense.find({ userId, date: { $gte: rangeStart, $lt: rangeEnd } }).lean(),
  ]);

  const existingIncome = new Set(
    monthIncomes.map((item) => incomeFingerprint(item))
  );
  const existingExpense = new Set(
    monthExpenses.map((item) => expenseFingerprint(item))
  );

  const result: ProcessRecurringResult = {
    month: monthKey,
    created: { income: 0, expense: 0 },
    skipped: { income: 0, expense: 0 },
    entries: [],
  };

  const incomeByFingerprint = new Map<string, IIncome>();
  for (const item of incomes) {
    const key = incomeFingerprint(item);
    if (!incomeByFingerprint.has(key)) {
      incomeByFingerprint.set(key, item);
    }
  }

  for (const template of incomeTemplates) {
    if (existingIncome.has(template.fingerprint)) {
      result.skipped.income += 1;
      continue;
    }
    const source = incomeByFingerprint.get(template.fingerprint);
    if (!source) continue;

    const date = entryDateForMonth(source.date, monthKey);
    await Income.create({
      userId,
      amount: source.amount,
      source: source.source,
      date,
      incomeType: source.incomeType,
      description: source.description
        ? `${source.description} (recurring)`
        : 'Recurring income',
      recurring: true,
    });
    result.created.income += 1;
    result.entries.push({
      kind: 'income',
      label: source.source,
      amount: source.amount,
      date: date.toISOString().slice(0, 10),
    });
  }

  const expenseByFingerprint = new Map<string, IExpense>();
  for (const item of expenses) {
    const key = expenseFingerprint(item);
    if (!expenseByFingerprint.has(key)) {
      expenseByFingerprint.set(key, item);
    }
  }

  for (const template of expenseTemplates) {
    if (existingExpense.has(template.fingerprint)) {
      result.skipped.expense += 1;
      continue;
    }
    const source = expenseByFingerprint.get(template.fingerprint);
    if (!source) continue;

    const date = entryDateForMonth(source.date, monthKey);
    await Expense.create({
      userId,
      amount: source.amount,
      category: source.category,
      subcategory: source.subcategory,
      date,
      paymentMethod: source.paymentMethod,
      description: source.description,
      transactionType: source.transactionType,
      recurring: true,
    });
    result.created.expense += 1;
    result.entries.push({
      kind: 'expense',
      label: source.description,
      amount: source.amount,
      date: date.toISOString().slice(0, 10),
    });
  }

  return result;
}

export async function processRecurringForAllUsers(monthKey = monthKeyFromDate(new Date())) {
  if (!isDatabaseConnected()) return { usersProcessed: 0, totalCreated: 0 };

  const users = await User.find({}).select('_id').lean();
  let totalCreated = 0;

  for (const user of users) {
    const result = await processRecurringForUser(String(user._id), monthKey);
    totalCreated += result.created.income + result.created.expense;
  }

  return { usersProcessed: users.length, totalCreated, month: monthKey };
}
