import mongoose from 'mongoose';
import { AppError } from '../../utils/AppError.js';
import { isDatabaseConnected } from '../../config/db.js';
import { Debt, IDebt } from './debt.model.js';
import { CreateDebtInput, UpdateDebtInput } from './debt.validation.js';

export type PublicDebt = {
  id: string;
  name: string;
  principal: number;
  interestRate: number;
  tenureMonths: number;
  emiAmount: number;
  paidMonths: number;
  remainingMonths: number;
  remainingBalance: number;
  totalInterest: number;
  totalPaid: number;
  progressPercent: number;
  startDate: string;
  notes?: string;
};

function assertDatabase() {
  if (!isDatabaseConnected()) {
    throw new AppError('Database is not connected. Try again in a moment.', 503);
  }
}

function parseObjectId(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Debt not found.', 404);
  return new mongoose.Types.ObjectId(id);
}

/** Standard EMI formula */
export function calculateEmi(principal: number, annualRate: number, tenureMonths: number) {
  if (tenureMonths <= 0) return 0;
  if (annualRate === 0) return principal / tenureMonths;
  const r = annualRate / 12 / 100;
  const factor = (1 + r) ** tenureMonths;
  return Number(((principal * r * factor) / (factor - 1)).toFixed(2));
}

export function toPublicDebt(debt: IDebt): PublicDebt {
  const emi = debt.emiAmount;
  const paidMonths = Math.min(debt.paidMonths, debt.tenureMonths);
  const remainingMonths = Math.max(0, debt.tenureMonths - paidMonths);
  const totalPaid = paidMonths * emi;
  const totalPayable = emi * debt.tenureMonths;
  const totalInterest = Math.max(0, totalPayable - debt.principal);
  const remainingBalance = Math.max(0, totalPayable - totalPaid);
  const progressPercent = debt.tenureMonths === 0 ? 0 : Math.round((paidMonths / debt.tenureMonths) * 100);

  return {
    id: String(debt._id),
    name: debt.name,
    principal: debt.principal,
    interestRate: debt.interestRate,
    tenureMonths: debt.tenureMonths,
    emiAmount: emi,
    paidMonths,
    remainingMonths,
    remainingBalance: Math.round(remainingBalance),
    totalInterest: Math.round(totalInterest),
    totalPaid: Math.round(totalPaid),
    progressPercent,
    startDate: debt.startDate.toISOString().slice(0, 10),
    notes: debt.notes || undefined,
  };
}

export async function listDebts(userId: string) {
  assertDatabase();
  const items = await Debt.find({ userId }).sort({ createdAt: -1 });
  const debts = items.map(toPublicDebt);
  const totalRemaining = debts.reduce((s, d) => s + d.remainingBalance, 0);
  const totalEmi = debts.reduce((s, d) => s + (d.remainingMonths > 0 ? d.emiAmount : 0), 0);
  return { debts, count: debts.length, totalRemaining, totalMonthlyEmi: totalEmi };
}

export async function createDebt(userId: string, input: CreateDebtInput) {
  assertDatabase();
  const emiAmount = calculateEmi(input.principal, input.interestRate, input.tenureMonths);
  const debt = await Debt.create({
    userId,
    ...input,
    emiAmount,
    startDate: new Date(`${input.startDate}T00:00:00.000Z`),
    paidMonths: input.paidMonths ?? 0,
  });
  return toPublicDebt(debt);
}

export async function updateDebt(userId: string, id: string, input: UpdateDebtInput) {
  assertDatabase();
  const debt = await Debt.findOne({ _id: parseObjectId(id), userId });
  if (!debt) throw new AppError('Debt not found.', 404);

  if (input.name !== undefined) debt.name = input.name;
  if (input.principal !== undefined) debt.principal = input.principal;
  if (input.interestRate !== undefined) debt.interestRate = input.interestRate;
  if (input.tenureMonths !== undefined) debt.tenureMonths = input.tenureMonths;
  if (input.paidMonths !== undefined) debt.paidMonths = input.paidMonths;
  if (input.startDate !== undefined) debt.startDate = new Date(`${input.startDate}T00:00:00.000Z`);
  if (input.notes !== undefined) debt.notes = input.notes || undefined;

  const p = debt.principal;
  const r = debt.interestRate;
  const t = debt.tenureMonths;
  debt.emiAmount = calculateEmi(p, r, t);

  await debt.save();
  return toPublicDebt(debt);
}

export async function deleteDebt(userId: string, id: string) {
  assertDatabase();
  const debt = await Debt.findOneAndDelete({ _id: parseObjectId(id), userId });
  if (!debt) throw new AppError('Debt not found.', 404);
}
