import { z } from 'zod';
import { AppError } from '../../utils/AppError.js';
import { isDatabaseConnected } from '../../config/db.js';
import { Income } from '../income/income.model.js';
import { Expense } from '../expense/expense.model.js';
import { listDebts } from '../debt/debt.service.js';
import { listGoals } from '../goal/goal.service.js';
import { NetWorthItem } from '../networth/networth.model.js';

export const lifePlanSchema = z.object({
  years: z.coerce.number().int().min(1).max(10).default(5),
  annualIncomeGrowth: z.coerce.number().min(-20).max(30).default(5),
  annualInflation: z.coerce.number().min(0).max(25).default(8),
});

function assertDatabase() {
  if (!isDatabaseConnected()) {
    throw new AppError('Database is not connected. Try again in a moment.', 503);
  }
}

function seedFrom(userId: string) {
  return userId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 17);
}

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(random: () => number) {
  const left = Math.max(random(), 1e-9);
  const right = Math.max(random(), 1e-9);
  return Math.sqrt(-2 * Math.log(left)) * Math.cos(2 * Math.PI * right);
}

function percentile(values: number[], ratio: number) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor(ratio * (sorted.length - 1))));
  return Math.round(sorted[index]);
}

export async function runLifePlan(
  userId: string,
  years: number,
  annualIncomeGrowth: number,
  annualInflation: number
) {
  assertDatabase();
  const [incomes, expenses, debts, goals, assets, liabilities] = await Promise.all([
    Income.find({ userId }).select('amount date'),
    Expense.find({ userId }).select('amount date'),
    listDebts(userId),
    listGoals(userId),
    NetWorthItem.find({ userId, kind: 'asset' }).select('value'),
    NetWorthItem.find({ userId, kind: 'liability' }).select('value'),
  ]);

  const incomeByMonth: Record<string, number> = {};
  const expenseByMonth: Record<string, number> = {};
  for (const row of incomes) {
    const key = row.date.toISOString().slice(0, 7);
    incomeByMonth[key] = (incomeByMonth[key] || 0) + row.amount;
  }
  for (const row of expenses) {
    const key = row.date.toISOString().slice(0, 7);
    expenseByMonth[key] = (expenseByMonth[key] || 0) + row.amount;
  }
  const incomeMonths = Object.values(incomeByMonth);
  const expenseMonths = Object.values(expenseByMonth);
  const baseIncome = incomeMonths.length
    ? incomeMonths.reduce((sum, value) => sum + value, 0) / incomeMonths.length
    : 0;
  const baseExpense = expenseMonths.length
    ? expenseMonths.reduce((sum, value) => sum + value, 0) / expenseMonths.length
    : 0;
  if (baseIncome === 0 && baseExpense === 0) {
    throw new AppError('Add income or expenses before running a life plan.', 400);
  }

  const emi = debts.totalMonthlyEmi;
  const goalNeed = goals.goals
    .filter((goal) => goal.status === 'ACTIVE')
    .reduce((sum, goal) => sum + goal.requiredMonthly, 0);
  const goalRemaining = goals.goals
    .filter((goal) => goal.status === 'ACTIVE')
    .reduce((sum, goal) => sum + goal.remaining, 0);
  const startWorth =
    assets.reduce((sum, item) => sum + item.value, 0) - liabilities.reduce((sum, item) => sum + item.value, 0);
  const months = years * 12;
  const paths = 800;
  const random = mulberry32(seedFrom(userId));
  const ending: number[] = [];
  const yearly: number[][] = Array.from({ length: years }, () => []);
  let goalsReached = 0;

  for (let path = 0; path < paths; path += 1) {
    let income = baseIncome;
    let spending = baseExpense;
    let worth = startWorth;
    let savedTowardGoals = 0;
    for (let month = 1; month <= months; month += 1) {
      income *= 1 + annualIncomeGrowth / 100 / 12 + gaussian(random) * 0.01;
      spending *= 1 + annualInflation / 100 / 12;
      const contribution = Math.min(goalNeed, Math.max(0, income - spending - emi));
      savedTowardGoals += contribution;
      worth += income - spending - emi;
      if (month % 12 === 0) yearly[month / 12 - 1].push(worth);
    }
    ending.push(worth);
    if (savedTowardGoals >= goalRemaining) goalsReached += 1;
  }

  return {
    years,
    paths,
    startNetWorth: Math.round(startWorth),
    monthlyIncome: Math.round(baseIncome),
    monthlyExpense: Math.round(baseExpense),
    monthlyDebt: Math.round(emi),
    monthlyGoalNeed: Math.round(goalNeed),
    ending: {
      p10: percentile(ending, 0.1),
      p50: percentile(ending, 0.5),
      p90: percentile(ending, 0.9),
    },
    yearly: yearly.map((values, index) => ({
      year: index + 1,
      p10: percentile(values, 0.1),
      p50: percentile(values, 0.5),
      p90: percentile(values, 0.9),
    })),
    goalReachPercent: goalRemaining === 0 ? 100 : Math.round((goalsReached / paths) * 100),
  };
}
