import { Request, Response, NextFunction } from 'express';
import { isDatabaseConnected } from '../config/db.js';
import { AuditLog } from '../modules/audit/audit.model.js';
import { User } from '../modules/auth/user.model.js';

const SKIP_PREFIXES = [
  '/api/health',
  '/api/notifications',
  '/api/assistant',
  '/api/reports',
];

const MODULE_LABELS: Record<string, string> = {
  income: 'Income',
  expenses: 'Expenses',
  budgets: 'Budgets',
  goals: 'Goals',
  profile: 'Profile',
  predictions: 'Predictions',
  anomalies: 'Anomalies',
  auth: 'Auth',
  admin: 'Admin',
  import: 'Import',
};

function clientIp(req: Request) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function pathOnly(req: Request) {
  return (req.originalUrl || req.url).split('?')[0];
}

function moduleFromPath(path: string) {
  const segment = path.replace(/^\/api\//, '').split('/')[0] || 'system';
  return MODULE_LABELS[segment] || segment;
}

function actionFrom(method: string, path: string, module: string) {
  const slug = module.replace(/\s+/g, '_').toUpperCase();
  if (path.includes('/train')) return 'TRAIN_PREDICTION';
  if (path.includes('/scan')) return 'SCAN_ANOMALY';
  if (method === 'POST') return `CREATE_${slug}`;
  if (method === 'PATCH' || method === 'PUT') return `UPDATE_${slug}`;
  if (method === 'DELETE') return `DELETE_${slug}`;
  return `${method}_${slug}`;
}

function shouldLog(req: Request, res: Response) {
  const method = req.method.toUpperCase();
  if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) return false;
  if (res.statusCode >= 400) return false;
  if (!req.user) return false;
  const path = pathOnly(req);
  return !SKIP_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

async function writeAudit(req: Request, res: Response) {
  if (!shouldLog(req, res) || !isDatabaseConnected() || !req.user) return;

  const path = pathOnly(req);
  const module = moduleFromPath(path);
  let userName = req.user.email;
  try {
    const user = await User.findById(req.user.id).select('name email');
    if (user) userName = user.name || user.email;
  } catch {
    // Keep email from the token if the lookup fails.
  }

  await AuditLog.create({
    userId: req.user.id,
    userName,
    action: actionFrom(req.method.toUpperCase(), path, module),
    module,
    ipAddress: clientIp(req),
    method: req.method.toUpperCase(),
    path,
  });
}

export function auditLogger(req: Request, res: Response, next: NextFunction) {
  res.on('finish', () => {
    void writeAudit(req, res).catch((error) => {
      console.error('Audit log write failed:', error instanceof Error ? error.message : error);
    });
  });
  next();
}
