import { AppError } from '../../utils/AppError.js';
import { isDatabaseConnected } from '../../config/db.js';
import { User } from '../auth/user.model.js';
import { getHealthScore } from '../score/score.service.js';
import { HealthScoreSnapshot, IHealthScoreSnapshot } from './health-history.model.js';

function assertDatabase() {
  if (!isDatabaseConnected()) {
    throw new AppError('Database is not connected. Try again in a moment.', 503);
  }
}

function monthKey() {
  return new Date().toISOString().slice(0, 7);
}

function toPublic(item: IHealthScoreSnapshot) {
  return {
    id: String(item._id),
    monthKey: item.monthKey,
    overallScore: item.overallScore,
    status: item.status,
    componentScores: item.componentScores,
    recordedAt: item.recordedAt.toISOString(),
  };
}

export async function recordHealthSnapshot(userId: string) {
  assertDatabase();
  const score = await getHealthScore(userId);
  const key = monthKey();

  const snapshot = await HealthScoreSnapshot.findOneAndUpdate(
    { userId, monthKey: key },
    {
      $set: {
        overallScore: score.overallScore,
        status: score.status,
        componentScores: score.componentScores,
        recordedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  return toPublic(snapshot);
}

export async function listHealthHistory(userId: string, limit = 12) {
  assertDatabase();
  const items = await HealthScoreSnapshot.find({ userId })
    .sort({ monthKey: -1 })
    .limit(limit);
  return { history: items.map(toPublic), count: items.length };
}

export async function recordAllUsersHealthSnapshots() {
  if (!isDatabaseConnected()) return { usersProcessed: 0 };
  const users = await User.find({}).select('_id').lean();
  for (const user of users) {
    try {
      await recordHealthSnapshot(String(user._id));
    } catch {
      /* skip user on error */
    }
  }
  return { usersProcessed: users.length, month: monthKey() };
}
