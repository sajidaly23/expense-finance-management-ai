import mongoose from 'mongoose';
import { AppError } from '../../utils/AppError.js';
import { isDatabaseConnected } from '../../config/db.js';
import { Income, IIncome } from './income.model.js';
import { CreateIncomeInput, ListIncomeQuery, UpdateIncomeInput } from './income.validation.js';

export type PublicIncome = {
  id: string;
  userId: string;
  amount: number;
  source: string;
  date: string;
  incomeType: IIncome['incomeType'];
  description?: string;
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

export function toPublicIncome(income: IIncome): PublicIncome {
  return {
    id: String(income._id),
    userId: String(income.userId),
    amount: income.amount,
    source: income.source,
    date: toDateOnly(income.date),
    incomeType: income.incomeType,
    description: income.description || undefined,
    recurring: income.recurring,
  };
}

function parseObjectId(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Income entry not found.', 404);
  }
  return new mongoose.Types.ObjectId(id);
}

export async function listIncomes(userId: string, query: ListIncomeQuery) {
  assertDatabase();

  const filter: Record<string, unknown> = { userId };
  if (query.incomeType && query.incomeType !== 'ALL') {
    filter.incomeType = query.incomeType;
  }
  if (query.search) {
    filter.$or = [
      { source: { $regex: query.search, $options: 'i' } },
      { description: { $regex: query.search, $options: 'i' } },
    ];
  }
  if (query.from || query.to) {
    filter.date = {
      ...(query.from ? { $gte: new Date(`${query.from}T00:00:00.000Z`) } : {}),
      ...(query.to ? { $lte: new Date(`${query.to}T23:59:59.999Z`) } : {}),
    };
  }

  const incomes = await Income.find(filter).sort({ date: -1, createdAt: -1 });
  const publicIncomes = incomes.map(toPublicIncome);
  const totalAmount = publicIncomes.reduce((sum, item) => sum + item.amount, 0);

  return { incomes: publicIncomes, count: publicIncomes.length, totalAmount };
}

export async function getIncome(userId: string, id: string) {
  assertDatabase();
  const income = await Income.findOne({ _id: parseObjectId(id), userId });
  if (!income) {
    throw new AppError('Income entry not found.', 404);
  }
  return toPublicIncome(income);
}

export async function createIncome(userId: string, input: CreateIncomeInput) {
  assertDatabase();
  const income = await Income.create({
    userId,
    amount: input.amount,
    source: input.source,
    date: new Date(`${input.date}T00:00:00.000Z`),
    incomeType: input.incomeType,
    description: input.description || undefined,
    recurring: input.recurring ?? false,
  });
  return toPublicIncome(income);
}

export async function updateIncome(userId: string, id: string, input: UpdateIncomeInput) {
  assertDatabase();
  const income = await Income.findOne({ _id: parseObjectId(id), userId });
  if (!income) {
    throw new AppError('Income entry not found.', 404);
  }

  if (input.amount !== undefined) income.amount = input.amount;
  if (input.source !== undefined) income.source = input.source;
  if (input.date !== undefined) income.date = new Date(`${input.date}T00:00:00.000Z`);
  if (input.incomeType !== undefined) income.incomeType = input.incomeType;
  if (input.description !== undefined) income.description = input.description || undefined;
  if (input.recurring !== undefined) income.recurring = input.recurring;

  await income.save();
  return toPublicIncome(income);
}

export async function deleteIncome(userId: string, id: string) {
  assertDatabase();
  const income = await Income.findOneAndDelete({ _id: parseObjectId(id), userId });
  if (!income) {
    throw new AppError('Income entry not found.', 404);
  }
}
