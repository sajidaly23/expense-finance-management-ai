import { AppError } from '../../utils/AppError.js';
import { isDatabaseConnected } from '../../config/db.js';
import { Expense, EXPENSE_CATEGORIES, ExpenseCategory } from '../expense/expense.model.js';
import { Income } from '../income/income.model.js';
import { callPredict, callTrain } from '../ml/ml.client.js';
import { IPrediction, ModelMetrics, Prediction } from './prediction.model.js';

export type PublicPrediction = {
  id: string;
  userId: string;
  predictedAmount: number;
  previousMonthExpense: number;
  changeAmount: number;
  changePercentage: number;
  predictionPeriod: string;
  modelUsed: IPrediction['modelUsed'];
  modelMetrics: ModelMetrics;
  comparedModels: ModelMetrics[];
  categoryPredictions: IPrediction['categoryPredictions'];
  monthsUsed: number;
  generatedDate: string;
};

function assertDatabase() {
  if (!isDatabaseConnected()) {
    throw new AppError('Database is not connected. Try again in a moment.', 503);
  }
}

function toDateOnly(value: Date) {
  return value.toISOString().split('T')[0];
}

export function toPublicPrediction(item: IPrediction): PublicPrediction {
  return {
    id: String(item._id),
    userId: String(item.userId),
    predictedAmount: item.predictedAmount,
    previousMonthExpense: item.previousMonthExpense,
    changeAmount: item.changeAmount,
    changePercentage: item.changePercentage,
    predictionPeriod: item.predictionPeriod,
    modelUsed: item.modelUsed,
    modelMetrics: item.modelMetrics,
    comparedModels: item.comparedModels,
    categoryPredictions: item.categoryPredictions,
    monthsUsed: item.monthsUsed,
    generatedDate: toDateOnly(item.generatedAt || item.createdAt),
  };
}

async function loadLedger(userId: string) {
  const [expenses, incomes] = await Promise.all([
    Expense.find({ userId }).select('amount category date transactionType recurring description').lean(),
    Income.find({ userId }).select('amount date').lean(),
  ]);

  return {
    expenses: expenses.map((item) => ({
      id: String(item._id),
      amount: item.amount,
      category: item.category,
      date: toDateOnly(item.date),
      transactionType: item.transactionType,
      recurring: Boolean(item.recurring),
      description: item.description || '',
    })),
    incomes: incomes.map((item) => ({
      amount: item.amount,
      date: toDateOnly(item.date),
    })),
  };
}

function allowedCategory(value: string): ExpenseCategory {
  return (EXPENSE_CATEGORIES as readonly string[]).includes(value) ? (value as ExpenseCategory) : 'Other';
}

export async function getLatestPrediction(userId: string) {
  assertDatabase();
  const item = await Prediction.findOne({ userId }).sort({ generatedAt: -1, createdAt: -1 });
  return item ? toPublicPrediction(item) : null;
}

export async function trainAndPredict(userId: string) {
  assertDatabase();
  const ledger = await loadLedger(userId);
  if (ledger.expenses.length === 0) {
    throw new AppError('Add expenses in at least 3 different months before training a forecast.', 400);
  }

  const trained = await callTrain(userId, ledger.expenses, ledger.incomes);
  const forecast = await callPredict(userId, ledger.expenses, ledger.incomes);

  const comparedModels: ModelMetrics[] = (forecast.models || trained.models).map((model) => ({
    name: model.name,
    mae: model.mae,
    rmse: model.rmse,
    mape: model.mape,
    r2: model.r2,
    predictedAmount: model.predictedAmount,
  }));

  const saved = await Prediction.create({
    userId,
    predictedAmount: forecast.predictedAmount,
    previousMonthExpense: forecast.previousMonthExpense,
    changeAmount: forecast.changeAmount,
    changePercentage: forecast.changePercentage,
    predictionPeriod: forecast.predictionPeriod,
    modelUsed: forecast.bestModel,
    modelMetrics: forecast.modelMetrics,
    comparedModels,
    categoryPredictions: (forecast.categoryPredictions || []).map((row) => ({
      category: allowedCategory(row.category),
      predictedAmount: row.predictedAmount,
      previousAmount: row.previousAmount,
    })),
    monthsUsed: forecast.monthsUsed,
    generatedAt: new Date(),
  });

  return {
    train: trained,
    prediction: toPublicPrediction(saved),
  };
}
