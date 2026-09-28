import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IDebt extends Document {
  userId: Types.ObjectId;
  name: string;
  principal: number;
  interestRate: number;
  tenureMonths: number;
  emiAmount: number;
  paidMonths: number;
  startDate: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const debtSchema = new Schema<IDebt>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    principal: { type: Number, required: true, min: 0.01 },
    interestRate: { type: Number, required: true, min: 0, max: 100 },
    tenureMonths: { type: Number, required: true, min: 1, max: 600 },
    emiAmount: { type: Number, required: true, min: 0.01 },
    paidMonths: { type: Number, default: 0, min: 0 },
    startDate: { type: Date, required: true },
    notes: { type: String, trim: true, maxlength: 400 },
  },
  { timestamps: true }
);

export const Debt: Model<IDebt> = mongoose.models.Debt || mongoose.model<IDebt>('Debt', debtSchema);
