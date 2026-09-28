import mongoose from 'mongoose';
import { AppError } from '../../utils/AppError.js';
import { isDatabaseConnected } from '../../config/db.js';
import { listBudgets } from '../budget/budget.service.js';
import { listGoals } from '../goal/goal.service.js';
import { getHealthScore } from '../score/score.service.js';
import { getLatestPrediction } from '../prediction/prediction.service.js';
import { Anomaly } from '../anomaly/anomaly.model.js';
import { INotification, Notification, NotificationType } from './notification.model.js';

export type PublicNotification = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  date: string;
  sourceId: string;
};

function assertDatabase() {
  if (!isDatabaseConnected()) {
    throw new AppError('Database is not connected. Try again in a moment.', 503);
  }
}

function parseObjectId(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Notification not found.', 404);
  }
  return new mongoose.Types.ObjectId(id);
}

function formatRs(amount: number) {
  return `Rs. ${Math.round(amount).toLocaleString('en-US')}`;
}

function toPublicNotification(item: INotification): PublicNotification {
  return {
    id: String(item._id),
    title: item.title,
    message: item.message,
    type: item.type,
    read: item.read === true,
    date: (item.createdAt || new Date()).toISOString(),
    sourceId: item.sourceId,
  };
}

async function upsertNotice(
  userId: string,
  sourceId: string,
  title: string,
  message: string,
  type: NotificationType
) {
  await Notification.updateOne(
    { userId, sourceId },
    {
      $set: { title, message, type },
      $setOnInsert: { userId, sourceId, read: false },
    },
    { upsert: true }
  );
}

async function syncFromLiveData(userId: string) {
  const [budgetResult, goalResult, health, predictionResult, unresolved] = await Promise.all([
    listBudgets(userId, {}),
    listGoals(userId),
    getHealthScore(userId).catch(() => null),
    getLatestPrediction(userId).catch(() => null),
    Anomaly.find({ userId, status: 'UNRESOLVED' }).sort({ detectedAt: -1 }),
  ]);

  for (const budget of budgetResult.budgets) {
    if (budget.utilization <= 100) continue;
    const label = budget.category || 'Overall';
    await upsertNotice(
      userId,
      `budget:${budget.id}:${budget.month}`,
      `${label} budget exceeded`,
      `${label} is at ${budget.utilization}% utilization (${formatRs(budget.spent)} spent of ${formatRs(budget.amount)} for ${budget.month}).`,
      'budget'
    );
  }

  for (const goal of goalResult.goals) {
    if (goal.status === 'OVERDUE') {
      await upsertNotice(
        userId,
        `goal:overdue:${goal.id}`,
        `Goal overdue: ${goal.name}`,
        `${formatRs(goal.remaining)} remaining. Pace needed: ${formatRs(goal.requiredMonthly)}/month to reach ${goal.deadline}.`,
        'goal'
      );
      continue;
    }
    if (goal.status === 'COMPLETED') {
      await upsertNotice(
        userId,
        `goal:completed:${goal.id}`,
        `Goal achieved: ${goal.name}`,
        `You reached ${formatRs(goal.targetAmount)}. Congratulations!`,
        'goal'
      );
      continue;
    }
    const pct = goal.targetAmount === 0 ? 0 : Math.round((goal.currentAmount / goal.targetAmount) * 100);
    for (const milestone of [25, 50, 75]) {
      if (pct >= milestone) {
        await upsertNotice(
          userId,
          `goal:milestone:${goal.id}:${milestone}`,
          `${goal.name} — ${milestone}% funded`,
          `${formatRs(goal.currentAmount)} of ${formatRs(goal.targetAmount)} saved. ${formatRs(goal.remaining)} to go.`,
          'goal'
        );
      }
    }
  }

  if (health) {
    if (health.overallScore < 45) {
      await upsertNotice(
        userId,
        'health:at-risk',
        'Financial health at risk',
        `Score is ${health.overallScore}/100 (${health.status}). ${health.recommendations[0] || 'Review your budgets and savings.'}`,
        'health'
      );
    } else if (health.overallScore < 65) {
      await upsertNotice(
        userId,
        'health:moderate',
        'Financial health needs attention',
        `Score is ${health.overallScore}/100 (${health.status}). ${health.recommendations[0] || 'Improve savings rate or budget adherence.'}`,
        'health'
      );
    }
  }

  if (predictionResult) {
    const pred = predictionResult;
    if (pred.changePercentage > 15) {
      await upsertNotice(
        userId,
        `prediction:rise:${pred.id}`,
        'Forecast: spending may increase',
        `Next month predicted at ${formatRs(pred.predictedAmount)} (+${pred.changePercentage}% vs last month).`,
        'prediction'
      );
    }
    const overallBudget = budgetResult.budgets.find((b) => !b.category);
    if (overallBudget && pred.predictedAmount > overallBudget.amount) {
      await upsertNotice(
        userId,
        `prediction:budget:${pred.id}`,
        'Forecast exceeds monthly budget',
        `Predicted ${formatRs(pred.predictedAmount)} vs your ${formatRs(overallBudget.amount)} overall budget.`,
        'prediction'
      );
    }
  }

  for (const item of unresolved) {
    await upsertNotice(
      userId,
      `anomaly:${String(item._id)}`,
      `${item.severity} spending anomaly`,
      `${item.expenseDescription || item.category} of ${formatRs(item.amount)} looks unusual versus a typical ${formatRs(item.normalAverage)}. ${item.reason}`.trim(),
      'anomaly'
    );
  }
}

export async function listNotifications(userId: string) {
  assertDatabase();
  await syncFromLiveData(userId);
  const items = await Notification.find({ userId }).sort({ createdAt: -1, _id: -1 });
  const notifications = items.map(toPublicNotification);
  return {
    notifications,
    unreadCount: notifications.filter((item) => !item.read).length,
    count: notifications.length,
  };
}

export async function markNotificationRead(userId: string, id: string) {
  assertDatabase();
  const item = await Notification.findOneAndUpdate(
    { _id: parseObjectId(id), userId },
    { $set: { read: true } },
    { new: true }
  );
  if (!item) {
    throw new AppError('Notification not found.', 404);
  }
  return toPublicNotification(item);
}

export async function markAllNotificationsRead(userId: string) {
  assertDatabase();
  await Notification.updateMany({ userId }, { $set: { read: true } });
  const items = await Notification.find({ userId }).sort({ createdAt: -1, _id: -1 });
  const notifications = items.map(toPublicNotification);
  return {
    notifications,
    unreadCount: 0,
    count: notifications.length,
  };
}
