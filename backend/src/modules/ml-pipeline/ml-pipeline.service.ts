import { AppError } from '../../utils/AppError.js';
import { isDatabaseConnected } from '../../config/db.js';
import { User } from '../auth/user.model.js';
import { Expense } from '../expense/expense.model.js';
import { trainAndPredict } from '../prediction/prediction.service.js';
import { scanAnomalies } from '../anomaly/anomaly.service.js';

function assertDatabase() {
  if (!isDatabaseConnected()) {
    throw new AppError('Database is not connected. Try again in a moment.', 503);
  }
}

function monthCount(userId: string) {
  return Expense.distinct('date', { userId }).then((dates) => {
    const keys = new Set(dates.map((d) => new Date(d).toISOString().slice(0, 7)));
    return keys.size;
  });
}

export async function runMlPipelineForUser(userId: string) {
  assertDatabase();
  const months = await monthCount(userId);
  const expenseCount = await Expense.countDocuments({ userId });
  const result: { trained: boolean; scanned: boolean; messages: string[] } = {
    trained: false,
    scanned: false,
    messages: [],
  };

  if (months >= 3) {
    try {
      await trainAndPredict(userId);
      result.trained = true;
      result.messages.push('Forecast model trained and prediction stored.');
    } catch (err) {
      result.messages.push(err instanceof Error ? err.message : 'Training skipped.');
    }
  } else {
    result.messages.push(`Need expenses in 3+ months (have ${months}). Training skipped.`);
  }

  if (expenseCount >= 8) {
    try {
      await scanAnomalies(userId);
      result.scanned = true;
      result.messages.push('Anomaly scan completed.');
    } catch (err) {
      result.messages.push(err instanceof Error ? err.message : 'Anomaly scan skipped.');
    }
  } else {
    result.messages.push(`Need 8+ expenses (have ${expenseCount}). Anomaly scan skipped.`);
  }

  return result;
}

export async function runMlPipelineForAllUsers() {
  if (!isDatabaseConnected()) return { usersProcessed: 0 };
  const users = await User.find({}).select('_id').lean();
  let trained = 0;
  let scanned = 0;
  for (const user of users) {
    try {
      const r = await runMlPipelineForUser(String(user._id));
      if (r.trained) trained += 1;
      if (r.scanned) scanned += 1;
    } catch {
      /* continue */
    }
  }
  return { usersProcessed: users.length, trained, scanned };
}
