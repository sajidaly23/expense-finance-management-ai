import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export const NETWORTH_KINDS = ['asset', 'liability'] as const;
export type NetWorthKind = (typeof NETWORTH_KINDS)[number];

export const ASSET_TYPES = ['Cash', 'Savings', 'Investment', 'Property', 'Other'] as const;
export const LIABILITY_TYPES = ['Loan', 'Credit Card', 'Other'] as const;

export interface INetWorthItem extends Document {
  userId: Types.ObjectId;
  kind: NetWorthKind;
  name: string;
  category: string;
  value: number;
  asOfDate: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const netWorthSchema = new Schema<INetWorthItem>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    kind: { type: String, enum: NETWORTH_KINDS, required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, required: true, trim: true, maxlength: 60 },
    value: { type: Number, required: true, min: 0.01 },
    asOfDate: { type: Date, required: true },
    notes: { type: String, trim: true, maxlength: 400 },
  },
  { timestamps: true }
);

export const NetWorthItem: Model<INetWorthItem> =
  mongoose.models.NetWorthItem || mongoose.model<INetWorthItem>('NetWorthItem', netWorthSchema);
