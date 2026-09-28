import mongoose, { Document, Schema } from 'mongoose';

export interface IMerchantRule extends Document {
  userId: mongoose.Types.ObjectId;
  merchant: string;
  category: string;
  subcategory?: string;
  transactionType?: 'NEED' | 'WANT';
  recurring?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MerchantRuleSchema = new Schema<IMerchantRule>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    merchant: { type: String, required: true, lowercase: true, trim: true },
    category: { type: String, required: true, trim: true },
    subcategory: { type: String, trim: true },
    transactionType: { type: String, enum: ['NEED', 'WANT'] },
    recurring: { type: Boolean, default: false },
  },
  { timestamps: true }
);

MerchantRuleSchema.index({ userId: 1, merchant: 1 }, { unique: true });

export const MerchantRule = mongoose.model<IMerchantRule>('MerchantRule', MerchantRuleSchema);
