import mongoose from 'mongoose';
import { AppError } from '../../utils/AppError.js';
import { isDatabaseConnected } from '../../config/db.js';
import { Expense } from '../expense/expense.model.js';
import { Income } from '../income/income.model.js';
import { GoalContribution, IGoalContribution } from './goal.contribution.model.js';
import { ISavingsGoal, SavingsGoal, GoalStatus } from './goal.model.js';
import { ContributeGoalInput, CreateGoalInput, UpdateGoalInput } from './goal.validation.js';

export type PublicContribution = {
  id: string;
  goalId: string;
  amount: number;
  source: IGoalContribution['source'];
  date: string;
  notes: string;
  type: 'SAVINGS_CONTRIBUTION';
  category: string;
};

export type PublicGoal = {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  progress: number;
  remaining: number;
  deadline: string;
  priority: ISavingsGoal['priority'];
  status: GoalStatus;
  monthsRemaining: number;
  requiredMonthly: number;
  contributions: PublicContribution[];
};

function assertDatabase() {
  if (!isDatabaseConnected()) {
    throw new AppError('Database is not connected. Try again in a moment.', 503);
  }
}

function parseObjectId(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Savings goal not found.', 404);
  }
  return new mongoose.Types.ObjectId(id);
}

function toDateOnly(value: Date) {
  return value.toISOString().split('T')[0];
}

function monthsUntil(deadline: Date) {
  const now = new Date();
  const years = deadline.getUTCFullYear() - now.getUTCFullYear();
  const months = years * 12 + (deadline.getUTCMonth() - now.getUTCMonth());
  if (deadline.getUTCDate() < now.getUTCDate()) {
    return months - 1;
  }
  return months;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function toPublicContribution(entry: IGoalContribution): PublicContribution {
  return {
    id: String(entry._id),
    goalId: String(entry.goalId),
    amount: entry.amount,
    source: entry.source,
    date: toDateOnly(entry.date),
    notes: entry.notes || '',
    type: 'SAVINGS_CONTRIBUTION',
    category: entry.category,
  };
}

export function toPublicGoal(goal: ISavingsGoal, contributions: PublicContribution[] = []): PublicGoal {
  const currentAmount = roundMoney(goal.currentAmount);
  const remaining = roundMoney(Math.max(0, goal.targetAmount - currentAmount));
  const monthsLeft = monthsUntil(goal.deadline);
  const completed = remaining <= 0;
  const overdue = !completed && monthsLeft < 0;
  const status: GoalStatus = completed ? 'COMPLETED' : overdue ? 'OVERDUE' : 'ACTIVE';
  const monthsRemaining = Math.max(0, monthsLeft);
  const requiredMonthly = completed
    ? 0
    : monthsRemaining <= 0
      ? remaining
      : Math.ceil(remaining / monthsRemaining);
  const progress =
    goal.targetAmount === 0 ? 0 : Math.min(100, Math.round((currentAmount / goal.targetAmount) * 100));

  return {
    id: String(goal._id),
    userId: String(goal.userId),
    name: goal.name,
    targetAmount: goal.targetAmount,
    currentAmount,
    progress,
    remaining,
    deadline: toDateOnly(goal.deadline),
    priority: goal.priority,
    status,
    monthsRemaining,
    requiredMonthly,
    contributions,
  };
}

async function contributionsByGoal(userId: string) {
  const entries = await GoalContribution.find({ userId }).sort({ date: -1, createdAt: -1 });
  const grouped = new Map<string, PublicContribution[]>();
  for (const entry of entries) {
    const key = String(entry.goalId);
    const list = grouped.get(key) || [];
    list.push(toPublicContribution(entry));
    grouped.set(key, list);
  }
  return grouped;
}

async function salaryAvailable(userId: string) {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const [incomeRows, expenseRows, contributionRows] = await Promise.all([
    Income.aggregate<{ total: number }>([
      { $match: { userId: userObjectId } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Expense.aggregate<{ total: number }>([
      { $match: { userId: userObjectId } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    GoalContribution.aggregate<{ total: number }>([
      { $match: { userId: userObjectId, source: 'SALARY' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  const income = incomeRows[0]?.total || 0;
  const expenses = expenseRows[0]?.total || 0;
  const allocated = contributionRows[0]?.total || 0;
  return roundMoney(income - expenses - allocated);
}

export async function listGoals(userId: string) {
  assertDatabase();
  const [goals, history] = await Promise.all([
    SavingsGoal.find({ userId }).sort({ deadline: 1, createdAt: -1 }),
    contributionsByGoal(userId),
  ]);
  const publicGoals = goals.map((goal) => toPublicGoal(goal, history.get(String(goal._id)) || []));
  return { goals: publicGoals, count: publicGoals.length };
}

export async function getGoal(userId: string, id: string) {
  assertDatabase();
  const goal = await SavingsGoal.findOne({ _id: parseObjectId(id), userId });
  if (!goal) {
    throw new AppError('Savings goal not found.', 404);
  }
  return toPublicGoal(goal);
}

export async function createGoal(userId: string, input: CreateGoalInput) {
  assertDatabase();
  const goal = await SavingsGoal.create({
    userId,
    name: input.name,
    targetAmount: input.targetAmount,
    currentAmount: input.currentAmount ?? 0,
    deadline: new Date(`${input.deadline}T00:00:00.000Z`),
    priority: input.priority ?? 'MEDIUM',
  });
  return toPublicGoal(goal);
}

export async function updateGoal(userId: string, id: string, input: UpdateGoalInput) {
  assertDatabase();
  const goal = await SavingsGoal.findOne({ _id: parseObjectId(id), userId });
  if (!goal) {
    throw new AppError('Savings goal not found.', 404);
  }

  if (input.name !== undefined) goal.name = input.name;
  if (input.targetAmount !== undefined) goal.targetAmount = input.targetAmount;
  if (input.currentAmount !== undefined) goal.currentAmount = input.currentAmount;
  if (input.deadline !== undefined) goal.deadline = new Date(`${input.deadline}T00:00:00.000Z`);
  if (input.priority !== undefined) goal.priority = input.priority;

  await goal.save();
  return toPublicGoal(goal);
}

export async function contributeToGoal(userId: string, id: string, input: ContributeGoalInput) {
  assertDatabase();
  const goal = await SavingsGoal.findOne({ _id: parseObjectId(id), userId });
  if (!goal) {
    throw new AppError('Savings goal not found.', 404);
  }

  const amount = roundMoney(input.amount);
  const remaining = roundMoney(Math.max(0, goal.targetAmount - goal.currentAmount));
  if (remaining <= 0) {
    throw new AppError('This goal is already fully funded.', 400);
  }
  if (amount > remaining) {
    throw new AppError(`Amount exceeds the remaining Rs. ${remaining.toLocaleString()}.`, 400);
  }

  if (input.source === 'SALARY') {
    const available = await salaryAvailable(userId);
    if (amount > available) {
      throw new AppError(
        `Not enough unallocated income. Available balance is Rs. ${Math.max(0, available).toLocaleString()}.`,
        400
      );
    }
  }

  goal.currentAmount = roundMoney(goal.currentAmount + amount);
  await goal.save();

  await GoalContribution.create({
    userId,
    goalId: goal._id,
    amount,
    source: input.source,
    date: new Date(`${input.date}T00:00:00.000Z`),
    notes: input.notes || '',
    type: 'SAVINGS_CONTRIBUTION',
    category: goal.name,
  });

  const history = await GoalContribution.find({ userId, goalId: goal._id }).sort({ date: -1, createdAt: -1 });
  return toPublicGoal(goal, history.map(toPublicContribution));
}

export async function deleteGoal(userId: string, id: string) {
  assertDatabase();
  const goalId = parseObjectId(id);
  const goal = await SavingsGoal.findOneAndDelete({ _id: goalId, userId });
  if (!goal) {
    throw new AppError('Savings goal not found.', 404);
  }
  await GoalContribution.deleteMany({ userId, goalId });
}
