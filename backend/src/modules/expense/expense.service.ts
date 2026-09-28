import mongoose from 'mongoose';
import { AppError } from '../../utils/AppError.js';
import { isDatabaseConnected } from '../../config/db.js';
import { Expense, IExpense } from './expense.model.js';
import { CreateExpenseInput, ListExpenseQuery, UpdateExpenseInput } from './expense.validation.js';

export type PublicExpense = {
  id: string;
  userId: string;
  amount: number;
  category: IExpense['category'];
  subcategory?: string;
  date: string;
  paymentMethod: IExpense['paymentMethod'];
  description: string;
  transactionType: IExpense['transactionType'];
  recurring: boolean;
};

function assertDatabase() {
  if (!isDatabaseConnected()) {
    throw new AppError('Database is not connected. Try again in a moment.', 503);
  }
}

function toDateOnly(value: Date) {
  return value.toISOString().split('T')[0];
}

export function toPublicExpense(expense: IExpense): PublicExpense {
  return {
    id: String(expense._id),
    userId: String(expense.userId),
    amount: expense.amount,
    category: expense.category,
    subcategory: expense.subcategory || undefined,
    date: toDateOnly(expense.date),
    paymentMethod: expense.paymentMethod,
    description: expense.description,
    transactionType: expense.transactionType,
    recurring: expense.recurring,
  };
}

function parseObjectId(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Expense entry not found.', 404);
  }
  return new mongoose.Types.ObjectId(id);
}

export async function listExpenses(userId: string, query: ListExpenseQuery) {
  assertDatabase();

  const filter: Record<string, unknown> = { userId };
  if (query.category && query.category !== 'ALL') {
    filter.category = query.category;
  }
  if (query.transactionType && query.transactionType !== 'ALL') {
    filter.transactionType = query.transactionType;
  }
  if (query.paymentMethod && query.paymentMethod !== 'ALL') {
    filter.paymentMethod = query.paymentMethod;
  }
  if (query.search) {
    filter.$or = [
      { description: { $regex: query.search, $options: 'i' } },
      { subcategory: { $regex: query.search, $options: 'i' } },
      { category: { $regex: query.search, $options: 'i' } },
    ];
  }
  if (query.from || query.to) {
    filter.date = {
      ...(query.from ? { $gte: new Date(`${query.from}T00:00:00.000Z`) } : {}),
      ...(query.to ? { $lte: new Date(`${query.to}T23:59:59.999Z`) } : {}),
    };
  }

  const expenses = await Expense.find(filter).sort({ date: -1, createdAt: -1 });
  const publicExpenses = expenses.map(toPublicExpense);
  const totalAmount = publicExpenses.reduce((sum, item) => sum + item.amount, 0);
  const needsTotal = publicExpenses
    .filter((item) => item.transactionType === 'NEED')
    .reduce((sum, item) => sum + item.amount, 0);
  const wantsTotal = publicExpenses
    .filter((item) => item.transactionType === 'WANT')
    .reduce((sum, item) => sum + item.amount, 0);

  return {
    expenses: publicExpenses,
    count: publicExpenses.length,
    totalAmount,
    needsTotal,
    wantsTotal,
  };
}

export async function getExpense(userId: string, id: string) {
  assertDatabase();
  const expense = await Expense.findOne({ _id: parseObjectId(id), userId });
  if (!expense) {
    throw new AppError('Expense entry not found.', 404);
  }
  return toPublicExpense(expense);
}

export async function createExpense(userId: string, input: CreateExpenseInput) {
  assertDatabase();
  const expense = await Expense.create({
    userId,
    amount: input.amount,
    category: input.category,
    subcategory: input.subcategory || undefined,
    date: new Date(`${input.date}T00:00:00.000Z`),
    paymentMethod: input.paymentMethod,
    description: input.description,
    transactionType: input.transactionType,
    recurring: input.recurring ?? false,
  });
  return toPublicExpense(expense);
}

export async function updateExpense(userId: string, id: string, input: UpdateExpenseInput) {
  assertDatabase();
  const expense = await Expense.findOne({ _id: parseObjectId(id), userId });
  if (!expense) {
    throw new AppError('Expense entry not found.', 404);
  }

  if (input.amount !== undefined) expense.amount = input.amount;
  if (input.category !== undefined) expense.category = input.category;
  if (input.subcategory !== undefined) expense.subcategory = input.subcategory || undefined;
  if (input.date !== undefined) expense.date = new Date(`${input.date}T00:00:00.000Z`);
  if (input.paymentMethod !== undefined) expense.paymentMethod = input.paymentMethod;
  if (input.description !== undefined) expense.description = input.description;
  if (input.transactionType !== undefined) expense.transactionType = input.transactionType;
  if (input.recurring !== undefined) expense.recurring = input.recurring;

  await expense.save();
  return toPublicExpense(expense);
}

export async function deleteExpense(userId: string, id: string) {
  assertDatabase();
  const expense = await Expense.findOneAndDelete({ _id: parseObjectId(id), userId });
  if (!expense) {
    throw new AppError('Expense entry not found.', 404);
  }
}
