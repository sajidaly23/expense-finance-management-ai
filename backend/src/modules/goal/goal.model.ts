import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export const GOAL_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type GoalPriority = (typeof GOAL_PRIORITIES)[number];
export type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'OVERDUE';

export interface ISavingsGoal extends Document {
  userId: Types.ObjectId;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: Date;
  priority: GoalPriority;
  createdAt: Date;
  updatedAt: Date;
}

const savingsGoalSchema = new Schema<ISavingsGoal>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    targetAmount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    currentAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    deadline: {
      type: Date,
      required: true,
    },
    priority: {
      type: String,
      enum: GOAL_PRIORITIES,
      default: 'MEDIUM',
    },
  },
  { timestamps: true }
);

savingsGoalSchema.index({ userId: 1, deadline: 1 });

export const SavingsGoal: Model<ISavingsGoal> =
  mongoose.models.SavingsGoal || mongoose.model<ISavingsGoal>('SavingsGoal', savingsGoalSchema);
