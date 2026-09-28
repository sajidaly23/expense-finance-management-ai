import mongoose from 'mongoose';
import { AppError } from '../../utils/AppError.js';
import { isDatabaseConnected } from '../../config/db.js';
import { listDebts } from '../debt/debt.service.js';
import { NetWorthItem, INetWorthItem } from './networth.model.js';
import { CreateNetWorthInput, UpdateNetWorthInput } from './networth.validation.js';

export type PublicNetWorthItem = {
  id: string;
  kind: INetWorthItem['kind'];
  name: string;
  category: string;
  value: number;
  asOfDate: string;
  notes?: string;
};

function assertDatabase() {
  if (!isDatabaseConnected()) {
    throw new AppError('Database is not connected. Try again in a moment.', 503);
  }
}

function parseObjectId(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Net worth item not found.', 404);
  return new mongoose.Types.ObjectId(id);
}

function toPublic(item: INetWorthItem): PublicNetWorthItem {
  return {
    id: String(item._id),
    kind: item.kind,
    name: item.name,
    category: item.category,
    value: item.value,
    asOfDate: item.asOfDate.toISOString().slice(0, 10),
    notes: item.notes || undefined,
  };
}

export async function getNetWorthSummary(userId: string) {
  assertDatabase();
  const [items, debtResult] = await Promise.all([
    NetWorthItem.find({ userId }).sort({ kind: 1, asOfDate: -1 }),
    listDebts(userId),
  ]);

  const assets = items.filter((i) => i.kind === 'asset');
  const liabilities = items.filter((i) => i.kind === 'liability');
  const totalAssets = assets.reduce((s, i) => s + i.value, 0);
  const totalLiabilities = liabilities.reduce((s, i) => s + i.value, 0) + debtResult.totalRemaining;
  const netWorth = totalAssets - totalLiabilities;

  return {
    items: items.map(toPublic),
    assets: assets.map(toPublic),
    liabilities: liabilities.map(toPublic),
    totalAssets: Math.round(totalAssets),
    totalLiabilities: Math.round(totalLiabilities),
    debtRemaining: debtResult.totalRemaining,
    netWorth: Math.round(netWorth),
    count: items.length,
  };
}

export async function createNetWorthItem(userId: string, input: CreateNetWorthInput) {
  assertDatabase();
  const item = await NetWorthItem.create({
    userId,
    ...input,
    asOfDate: new Date(`${input.asOfDate}T00:00:00.000Z`),
  });
  return toPublic(item);
}

export async function updateNetWorthItem(userId: string, id: string, input: UpdateNetWorthInput) {
  assertDatabase();
  const item = await NetWorthItem.findOne({ _id: parseObjectId(id), userId });
  if (!item) throw new AppError('Net worth item not found.', 404);
  if (input.kind !== undefined) item.kind = input.kind;
  if (input.name !== undefined) item.name = input.name;
  if (input.category !== undefined) item.category = input.category;
  if (input.value !== undefined) item.value = input.value;
  if (input.asOfDate !== undefined) item.asOfDate = new Date(`${input.asOfDate}T00:00:00.000Z`);
  if (input.notes !== undefined) item.notes = input.notes || undefined;
  await item.save();
  return toPublic(item);
}

export async function deleteNetWorthItem(userId: string, id: string) {
  assertDatabase();
  const item = await NetWorthItem.findOneAndDelete({ _id: parseObjectId(id), userId });
  if (!item) throw new AppError('Net worth item not found.', 404);
}
