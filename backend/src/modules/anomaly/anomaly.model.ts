import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { EXPENSE_CATEGORIES, ExpenseCategory } from '../expense/expense.model.js';

export const ANOMALY_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export const ANOMALY_STATUSES = ['UNRESOLVED', 'VERIFIED', 'DISMISSED'] as const;
export type AnomalySeverity = (typeof ANOMALY_SEVERITIES)[number];
export type AnomalyStatus = (typeof ANOMALY_STATUSES)[number];

export interface IAnomaly extends Document {
  userId: Types.ObjectId;
  expenseId: Types.ObjectId;
  expenseDescription: string;
  amount: number;
  normalAverage: number;
  category: ExpenseCategory;
  anomalyScore: number;
  severity: AnomalySeverity;
  reason: string;
  detectedAt: Date;
  status: AnomalyStatus;
  createdAt: Date;
  updatedAt: Date;
}

const anomalySchema = new Schema<IAnomaly>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    expenseId: {
      type: Schema.Types.ObjectId,
      ref: 'Expense',
      required: true,
    },
    expenseDescription: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
    normalAverage: { type: Number, required: true },
    category: { type: String, enum: EXPENSE_CATEGORIES, required: true },
    anomalyScore: { type: Number, required: true },
    severity: { type: String, enum: ANOMALY_SEVERITIES, required: true },
    reason: { type: String, required: true },
    detectedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ANOMALY_STATUSES, default: 'UNRESOLVED' },
  },
  { timestamps: true }
);

anomalySchema.index({ userId: 1, expenseId: 1 }, { unique: true });
anomalySchema.index({ userId: 1, detectedAt: -1 });

export const Anomaly: Model<IAnomaly> =
  mongoose.models.Anomaly || mongoose.model<IAnomaly>('Anomaly', anomalySchema);
