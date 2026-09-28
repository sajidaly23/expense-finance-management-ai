import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { EXPENSE_CATEGORIES, ExpenseCategory } from '../expense/expense.model.js';

export const MODEL_NAMES = ['Linear Regression', 'Random Forest Regressor', 'XGBoost Regressor'] as const;
export type ModelName = (typeof MODEL_NAMES)[number];

export type ModelMetrics = {
  name: ModelName;
  mae: number;
  rmse: number;
  mape: number;
  r2: number;
  predictedAmount?: number;
};

export type CategoryPrediction = {
  category: ExpenseCategory;
  predictedAmount: number;
  previousAmount: number;
};

export interface IPrediction extends Document {
  userId: Types.ObjectId;
  predictedAmount: number;
  previousMonthExpense: number;
  changeAmount: number;
  changePercentage: number;
  predictionPeriod: string;
  modelUsed: ModelName;
  modelMetrics: ModelMetrics;
  comparedModels: ModelMetrics[];
  categoryPredictions: CategoryPrediction[];
  monthsUsed: number;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const metricsSchema = new Schema(
  {
    name: { type: String, enum: MODEL_NAMES, required: true },
    mae: { type: Number, required: true },
    rmse: { type: Number, required: true },
    mape: { type: Number, required: true },
    r2: { type: Number, required: true },
    predictedAmount: { type: Number },
  },
  { _id: false }
);

const categorySchema = new Schema(
  {
    category: { type: String, enum: EXPENSE_CATEGORIES, required: true },
    predictedAmount: { type: Number, required: true },
    previousAmount: { type: Number, required: true },
  },
  { _id: false }
);

const predictionSchema = new Schema<IPrediction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    predictedAmount: { type: Number, required: true },
    previousMonthExpense: { type: Number, required: true },
    changeAmount: { type: Number, required: true },
    changePercentage: { type: Number, required: true },
    predictionPeriod: { type: String, required: true },
    modelUsed: { type: String, enum: MODEL_NAMES, required: true },
    modelMetrics: { type: metricsSchema, required: true },
    comparedModels: { type: [metricsSchema], default: [] },
    categoryPredictions: { type: [categorySchema], default: [] },
    monthsUsed: { type: Number, required: true },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

predictionSchema.index({ userId: 1, generatedAt: -1 });

export const Prediction: Model<IPrediction> =
  mongoose.models.Prediction || mongoose.model<IPrediction>('Prediction', predictionSchema);
