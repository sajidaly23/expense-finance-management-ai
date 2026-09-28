import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';
import { isDatabaseConnected } from '../../config/db.js';
import { User } from './user.model.js';

type TokenPayload = {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
};

async function loadUser(id: string) {
  if (!isDatabaseConnected()) {
    throw new AppError('Database is not connected. Try again in a moment.', 503);
  }

  const user = await User.findById(id).select('email role');
  if (!user) {
    throw new AppError('Session expired. Please sign in again.', 401);
  }

  return {
    id: String(user._id),
    email: user.email,
    role: user.role as 'USER' | 'ADMIN',
  };
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

  if (!token) {
    next(new AppError('Please sign in to continue.', 401));
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as TokenPayload;
    if (!decoded?.id) {
      next(new AppError('Session expired. Please sign in again.', 401));
      return;
    }
    req.user = await loadUser(decoded.id);
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    next(new AppError('Session expired. Please sign in again.', 401));
  }
}

export async function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    next(new AppError('Please sign in to continue.', 401));
    return;
  }

  try {
    const user = await loadUser(req.user.id);
    if (user.role !== 'ADMIN') {
      next(new AppError('Administrator access is required.', 403));
      return;
    }
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
