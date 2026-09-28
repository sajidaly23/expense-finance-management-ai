import { isDatabaseConnected } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import { User } from '../auth/user.model.js';
import { Income } from '../income/income.model.js';
import { Expense } from '../expense/expense.model.js';
import { Prediction } from '../prediction/prediction.model.js';
import { Anomaly } from '../anomaly/anomaly.model.js';
import { AuditLog, IAuditLog } from '../audit/audit.model.js';

export type PublicAuditLog = {
  id: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  ipAddress: string;
  timestamp: string;
};

function assertDatabase() {
  if (!isDatabaseConnected()) {
    throw new AppError('Database is not connected. Try again in a moment.', 503);
  }
}

function toPublicAuditLog(item: IAuditLog): PublicAuditLog {
  return {
    id: String(item._id),
    userId: String(item.userId),
    userName: item.userName,
    action: item.action,
    module: item.module,
    ipAddress: item.ipAddress,
    timestamp: (item.createdAt || new Date()).toISOString(),
  };
}

export type PublicAdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

export async function listUsers() {
  assertDatabase();
  const users = await User.find({}).select('name email role createdAt').sort({ createdAt: -1 }).limit(200);
  return {
    users: users.map((u) => ({
      id: String(u._id),
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: ((u as { createdAt?: Date }).createdAt || new Date()).toISOString(),
    })),
    count: users.length,
  };
}

export async function updateUserRole(adminId: string, targetUserId: string, role: 'USER' | 'ADMIN') {
  assertDatabase();
  if (adminId === targetUserId && role !== 'ADMIN') {
    throw new AppError('You cannot demote your own admin account.', 400);
  }
  const user = await User.findByIdAndUpdate(targetUserId, { role }, { new: true }).select('name email role');
  if (!user) throw new AppError('User not found.', 404);
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function getAdminOverview() {
  assertDatabase();

  const [userCount, incomeCount, expenseCount, predictionCount, anomalyCount, logs] = await Promise.all([
    User.countDocuments(),
    Income.countDocuments(),
    Expense.countDocuments(),
    Prediction.countDocuments(),
    Anomaly.countDocuments(),
    AuditLog.find().sort({ createdAt: -1 }).limit(50),
  ]);

  return {
    users: userCount,
    transactions: incomeCount + expenseCount,
    incomeRecords: incomeCount,
    expenseRecords: expenseCount,
    predictions: predictionCount,
    anomalies: anomalyCount,
    auditLogs: logs.map(toPublicAuditLog),
  };
}
