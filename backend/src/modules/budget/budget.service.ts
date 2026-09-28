import mongoose from 'mongoose';
import { AppError } from '../../utils/AppError.js';
import { isDatabaseConnected } from '../../config/db.js';
import { Expense } from '../expense/expense.model.js';
import { Budget, IBudget } from './budget.model.js';
import { CreateBudgetInput, ListBudgetQuery, UpdateBudgetInput } from './budget.validation.js';

export type PublicBudget = {
  id: string;
  userId: string;
  category?: IBudget['category'];
  amount: number;
  spent: number;
  remaining: number;
  utilization: number;
  month: string;
};

function assertDatabase() {
  if (!isDatabaseConnected()) {
    throw new AppError('Database is not connected. Try again in a moment.', 503);
  }
}

function parseObjectId(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Budget not found.', 404);
  }
  return new mongoose.Types.ObjectId(id);
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function monthRange(month: string) {
  const [year, monthNum] = month.split('-').map(Number);
  return {
    from: new Date(`${month}-01T00:00:00.000Z`),
    to: new Date(Date.UTC(year, monthNum, 1)),
  };
}

async function spendByCategory(userId: string, month: string) {
  const { from, to } = monthRange(month);
  const expenses = await Expense.find({
    userId,
    date: { $gte: from, $lt: to },
  })
    .select('amount category')
    .lean();

  const byCategory: Record<string, number> = {};
  let total = 0;
  for (const item of expenses) {
    total += item.amount;
    byCategory[item.category] = (byCategory[item.category] || 0) + item.amount;
  }
  return { total, byCategory };
}

function toPublicBudget(budget: IBudget, spent: number): PublicBudget {
  const remaining = Math.max(0, budget.amount - spent);
  const utilization = budget.amount === 0 ? 0 : Math.round((spent / budget.amount) * 100);
  return {
    id: String(budget._id),
    userId: String(budget.userId),
    category: budget.category || undefined,
    amount: budget.amount,
    spent,
    remaining,
    utilization,
    month: budget.month,
  };
}

function duplicateError(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code: number }).code === 11000;
}

export async function listBudgets(userId: string, query: ListBudgetQuery) {
  assertDatabase();
  const month = query.month || currentMonth();
  const budgets = await Budget.find({ userId, month }).sort({ category: 1 });
  const spend = await spendByCategory(userId, month);

  const publicBudgets = budgets.map((budget) =>
    toPublicBudget(budget, budget.category ? spend.byCategory[budget.category] || 0 : spend.total)
  );

  return { budgets: publicBudgets, month, totalSpent: spend.total, count: publicBudgets.length };
}

export async function getBudget(userId: string, id: string) {
  assertDatabase();
  const budget = await Budget.findOne({ _id: parseObjectId(id), userId });
  if (!budget) {
    throw new AppError('Budget not found.', 404);
  }
  const spend = await spendByCategory(userId, budget.month);
  return toPublicBudget(budget, budget.category ? spend.byCategory[budget.category] || 0 : spend.total);
}

export async function createBudget(userId: string, input: CreateBudgetInput) {
  assertDatabase();
  try {
    const budget = await Budget.create({
      userId,
      amount: input.amount,
      month: input.month,
      category: input.category || null,
    });
    const spend = await spendByCategory(userId, budget.month);
    return toPublicBudget(budget, budget.category ? spend.byCategory[budget.category] || 0 : spend.total);
  } catch (error) {
    if (duplicateError(error)) {
      throw new AppError('A budget for this month and category already exists.', 409);
    }
    throw error;
  }
}

export async function updateBudget(userId: string, id: string, input: UpdateBudgetInput) {
  assertDatabase();
  const budget = await Budget.findOne({ _id: parseObjectId(id), userId });
  if (!budget) {
    throw new AppError('Budget not found.', 404);
  }

  if (input.amount !== undefined) budget.amount = input.amount;
  if (input.month !== undefined) budget.month = input.month;
  if (input.category !== undefined) {
    budget.category = input.category ? input.category : null;
  }

  try {
    await budget.save();
  } catch (error) {
    if (duplicateError(error)) {
      throw new AppError('A budget for this month and category already exists.', 409);
    }
    throw error;
  }

  const spend = await spendByCategory(userId, budget.month);
  return toPublicBudget(budget, budget.category ? spend.byCategory[budget.category] || 0 : spend.total);
}

export async function deleteBudget(userId: string, id: string) {
  assertDatabase();
  const budget = await Budget.findOneAndDelete({ _id: parseObjectId(id), userId });
  if (!budget) {
    throw new AppError('Budget not found.', 404);
  }
}
