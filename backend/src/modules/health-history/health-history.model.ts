import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IHealthScoreSnapshot extends Document {
  userId: Types.ObjectId;
  monthKey: string;
  overallScore: number;
  status: string;
  componentScores: {
    savingsRate: number;
    budgetAdherence: number;
    expenseStability: number;
    emergencyFund: number;
    goalProgress: number;
  };
  recordedAt: Date;
  createdAt: Date;
}

const snapshotSchema = new Schema<IHealthScoreSnapshot>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    monthKey: { type: String, required: true },
    overallScore: { type: Number, required: true },
    status: { type: String, required: true },
    componentScores: {
      savingsRate: Number,
      budgetAdherence: Number,
      expenseStability: Number,
      emergencyFund: Number,
      goalProgress: Number,
    },
    recordedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

snapshotSchema.index({ userId: 1, monthKey: 1 }, { unique: true });

export const HealthScoreSnapshot: Model<IHealthScoreSnapshot> =
  mongoose.models.HealthScoreSnapshot ||
  mongoose.model<IHealthScoreSnapshot>('HealthScoreSnapshot', snapshotSchema);
