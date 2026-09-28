import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { EXPENSE_CATEGORIES, ExpenseCategory } from '../expense/expense.model.js';

export { EXPENSE_CATEGORIES };
export type { ExpenseCategory };

export interface IBudget extends Document {
  userId: Types.ObjectId;
  category?: ExpenseCategory | null;
  amount: number;
  month: string;
  createdAt: Date;
  updatedAt: Date;
}

const budgetSchema = new Schema<IBudget>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    category: {
      type: String,
      default: null,
      validate: {
        validator(value: string | null) {
          return value == null || (EXPENSE_CATEGORIES as readonly string[]).includes(value);
        },
        message: 'Select a valid category.',
      },
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    month: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}$/,
    },
  },
  { timestamps: true }
);

budgetSchema.index({ userId: 1, month: 1, category: 1 }, { unique: true });

export const Budget: Model<IBudget> =
  mongoose.models.Budget || mongoose.model<IBudget>('Budget', budgetSchema);
