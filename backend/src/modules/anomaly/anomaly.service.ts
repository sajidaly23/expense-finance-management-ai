import mongoose from 'mongoose';
import { z } from 'zod';
import { AppError } from '../../utils/AppError.js';
import { isDatabaseConnected } from '../../config/db.js';
import { Expense, EXPENSE_CATEGORIES, ExpenseCategory } from '../expense/expense.model.js';
import { callAnomalies } from '../ml/ml.client.js';
import { Anomaly, ANOMALY_STATUSES, IAnomaly } from './anomaly.model.js';

export type PublicAnomaly = {
  id: string;
  userId: string;
  expenseId: string;
  expenseDescription: string;
  amount: number;
  normalAverage: number;
  category: IAnomaly['category'];
  anomalyScore: number;
  severity: IAnomaly['severity'];
  reason: string;
  detectedAt: string;
  status: IAnomaly['status'];
};

export const updateAnomalySchema = z.object({
  status: z.enum(ANOMALY_STATUSES, { errorMap: () => ({ message: 'Select verified or dismissed.' }) }),
});

export type UpdateAnomalyInput = z.infer<typeof updateAnomalySchema>;

function assertDatabase() {
  if (!isDatabaseConnected()) {
    throw new AppError('Database is not connected. Try again in a moment.', 503);
  }
}

function parseObjectId(id: string, label = 'Anomaly') {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(`${label} not found.`, 404);
  }
  return new mongoose.Types.ObjectId(id);
}

function toDateTime(value: Date) {
  return value.toISOString();
}

export function toPublicAnomaly(item: IAnomaly): PublicAnomaly {
  return {
    id: String(item._id),
    userId: String(item.userId),
    expenseId: String(item.expenseId),
    expenseDescription: item.expenseDescription,
    amount: item.amount,
    normalAverage: item.normalAverage,
    category: item.category,
    anomalyScore: item.anomalyScore,
    severity: item.severity,
    reason: item.reason,
    detectedAt: toDateTime(item.detectedAt || item.createdAt),
    status: item.status,
  };
}

function allowedCategory(value: string): ExpenseCategory {
  return (EXPENSE_CATEGORIES as readonly string[]).includes(value) ? (value as ExpenseCategory) : 'Other';
}

export async function listAnomalies(userId: string) {
  assertDatabase();
  const items = await Anomaly.find({ userId }).sort({ detectedAt: -1, createdAt: -1 });
  return {
    anomalies: items.map(toPublicAnomaly),
    count: items.length,
  };
}

export async function scanAnomalies(userId: string) {
  assertDatabase();
  const ownerId = new mongoose.Types.ObjectId(userId);
  const expenses = await Expense.find({ userId: ownerId })
    .select('amount category date transactionType recurring description')
    .lean();

  if (expenses.length < 8) {
    throw new AppError('Add at least 8 expenses before scanning for unusual spend.', 400);
  }

  const payload = expenses.map((item) => ({
    id: String(item._id),
    amount: item.amount,
    category: item.category,
    date: item.date.toISOString().split('T')[0],
    transactionType: item.transactionType,
    recurring: Boolean(item.recurring),
    description: item.description || '',
  }));

  const result = await callAnomalies(userId, payload);

  const upserts = result.anomalies
    .filter((row) => mongoose.Types.ObjectId.isValid(row.expenseId))
    .map((row) => ({
      updateOne: {
        filter: { userId: ownerId, expenseId: new mongoose.Types.ObjectId(row.expenseId) },
        update: {
          $set: {
            expenseDescription: row.expenseDescription,
            amount: row.amount,
            normalAverage: row.normalAverage,
            category: allowedCategory(row.category),
            anomalyScore: row.anomalyScore,
            severity: row.severity,
            reason: row.reason,
            detectedAt: new Date(),
          },
          $setOnInsert: {
            userId: ownerId,
            expenseId: new mongoose.Types.ObjectId(row.expenseId),
            status: 'UNRESOLVED' as const,
          },
        },
        upsert: true,
      },
    }));

  if (upserts.length > 0) {
    await Anomaly.bulkWrite(upserts);
  }

  const flaggedObjectIds = result.anomalies
    .filter((row) => mongoose.Types.ObjectId.isValid(row.expenseId))
    .map((row) => new mongoose.Types.ObjectId(row.expenseId));

  await Anomaly.deleteMany({
    userId: ownerId,
    expenseId: { $nin: flaggedObjectIds },
    status: 'UNRESOLVED',
  });

  return listAnomalies(userId);
}

export async function updateAnomaly(userId: string, id: string, input: UpdateAnomalyInput) {
  assertDatabase();
  const item = await Anomaly.findOne({ _id: parseObjectId(id), userId });
  if (!item) {
    throw new AppError('Anomaly not found.', 404);
  }
  item.status = input.status;
  await item.save();
  return toPublicAnomaly(item);
}
