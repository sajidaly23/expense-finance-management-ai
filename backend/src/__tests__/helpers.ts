import request from 'supertest';
import { randomUUID } from 'node:crypto';
import type { Application } from 'express';

export function uniqueEmail(prefix = 'user') {
  return `${prefix}-${randomUUID()}@example.com`;
}

export async function registerUser(
  app: Application,
  overrides: { name?: string; email?: string; password?: string } = {}
) {
  const payload = {
    name: overrides.name || 'Test User',
    email: overrides.email || uniqueEmail(),
    password: overrides.password || 'password123',
  };
  const res = await request(app).post('/api/auth/register').send(payload);
  return { res, payload };
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}
