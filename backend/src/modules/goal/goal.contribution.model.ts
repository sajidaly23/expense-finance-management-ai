import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export const CONTRIBUTION_SOURCES = ['SALARY', 'SAVINGS'] as const;
export type ContributionSource = (typeof CONTRIBUTION_SOURCES)[number];

export interface IGoalContribution extends Document {
  userId: Types.ObjectId;
  goalId: Types.ObjectId;
  amount: number;
  source: ContributionSource;
  date: Date;
  notes: string;
  type: 'SAVINGS_CONTRIBUTION';
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

const goalContributionSchema = new Schema<IGoalContribution>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    goalId: {
      type: Schema.Types.ObjectId,
      ref: 'SavingsGoal',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    source: {
      type: String,
      enum: CONTRIBUTION_SOURCES,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 240,
      default: '',
    },
    type: {
      type: String,
      enum: ['SAVINGS_CONTRIBUTION'],
      default: 'SAVINGS_CONTRIBUTION',
      required: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
  },
  { timestamps: true }
);

goalContributionSchema.index({ userId: 1, goalId: 1, date: -1 });

export const GoalContribution: Model<IGoalContribution> =
  mongoose.models.GoalContribution ||
  mongoose.model<IGoalContribution>('GoalContribution', goalContributionSchema);
