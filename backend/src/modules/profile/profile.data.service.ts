import mongoose from 'mongoose';
import { AppError } from '../../utils/AppError.js';
import { isDatabaseConnected } from '../../config/db.js';
import { User } from '../auth/user.model.js';
import { Income } from '../income/income.model.js';
import { Expense } from '../expense/expense.model.js';
import { Budget } from '../budget/budget.model.js';
import { GoalContribution } from '../goal/goal.contribution.model.js';
import { SavingsGoal } from '../goal/goal.model.js';
import { Prediction } from '../prediction/prediction.model.js';
import { Anomaly } from '../anomaly/anomaly.model.js';
import { Notification } from '../notification/notification.model.js';
import { AssistantMessage } from '../assistant/assistant.model.js';
import { Debt } from '../debt/debt.model.js';
import { NetWorthItem } from '../networth/networth.model.js';
import { HealthScoreSnapshot } from '../health-history/health-history.model.js';

function assertDatabase() {
  if (!isDatabaseConnected()) {
    throw new AppError('Database is not connected. Try again in a moment.', 503);
  }
}

export async function exportUserData(userId: string) {
  assertDatabase();
  const user = await User.findById(userId).select('-password -resetPasswordToken -resetPasswordExpires');
  if (!user) throw new AppError('User not found.', 404);

  const [incomes, expenses, budgets, goals, predictions, anomalies, notifications, messages, debts, networth, healthHistory] =
    await Promise.all([
      Income.find({ userId }).lean(),
      Expense.find({ userId }).lean(),
      Budget.find({ userId }).lean(),
      SavingsGoal.find({ userId }).lean(),
      Prediction.find({ userId }).lean(),
      Anomaly.find({ userId }).lean(),
      Notification.find({ userId }).lean(),
      AssistantMessage.find({ userId }).lean(),
      Debt.find({ userId }).lean(),
      NetWorthItem.find({ userId }).lean(),
      HealthScoreSnapshot.find({ userId }).lean(),
    ]);

  return {
    exportedAt: new Date().toISOString(),
    user: {
      name: user.name,
      email: user.email,
      role: user.role,
      occupation: user.occupation,
      age: user.age,
      monthlyIncome: user.monthlyIncome,
      familySize: user.familySize,
      financialGoal: user.financialGoal,
      riskPreference: user.riskPreference,
    },
    incomes,
    expenses,
    budgets,
    goals,
    predictions,
    anomalies,
    notifications,
    assistantMessages: messages,
    debts,
    networth,
    healthHistory,
  };
}

export async function deleteUserAccount(userId: string, password: string) {
  assertDatabase();
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found.', 404);
  const valid = await user.comparePassword(password);
  if (!valid) throw new AppError('Incorrect password.', 401);

  const uid = new mongoose.Types.ObjectId(userId);
  await Promise.all([
    Income.deleteMany({ userId: uid }),
    Expense.deleteMany({ userId: uid }),
    Budget.deleteMany({ userId: uid }),
    SavingsGoal.deleteMany({ userId: uid }),
    GoalContribution.deleteMany({ userId: uid }),
    Prediction.deleteMany({ userId: uid }),
    Anomaly.deleteMany({ userId: uid }),
    Notification.deleteMany({ userId: uid }),
    AssistantMessage.deleteMany({ userId: uid }),
    Debt.deleteMany({ userId: uid }),
    NetWorthItem.deleteMany({ userId: uid }),
    HealthScoreSnapshot.deleteMany({ userId: uid }),
  ]);
  await User.findByIdAndDelete(userId);
  return { deleted: true };
}
