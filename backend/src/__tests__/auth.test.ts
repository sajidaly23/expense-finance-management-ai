import request from 'supertest';
import { describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { User } from '../modules/auth/user.model.js';
import { authHeader, registerUser, uniqueEmail } from './helpers.js';

describe('auth', () => {
  it('registers a user and returns a token', async () => {
    const { res, payload } = await registerUser(app, { name: 'Ada Lovelace' });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({
      name: 'Ada Lovelace',
      email: payload.email,
      role: 'USER',
    });
    expect(res.body.user).not.toHaveProperty('password');
  });

  it('rejects a duplicate email', async () => {
    const email = uniqueEmail('dup');
    await registerUser(app, { email });
    const second = await registerUser(app, { email, name: 'Other Person' });

    expect(second.res.status).toBe(409);
    expect(second.res.body.message).toMatch(/already exists/i);
  });

  it('logs in with the same credentials', async () => {
    const { payload } = await registerUser(app);
    const res = await request(app).post('/api/auth/login').send({
      email: payload.email,
      password: payload.password,
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.email).toBe(payload.email);
  });

  it('rejects a wrong password', async () => {
    const { payload } = await registerUser(app);
    const res = await request(app).post('/api/auth/login').send({
      email: payload.email,
      password: 'wrong-password',
    });

    expect(res.status).toBe(401);
  });

  it('returns the current user from /me using the database record', async () => {
    const { res: created } = await registerUser(app, { name: 'Grace Hopper' });
    const res = await request(app).get('/api/auth/me').set(authHeader(created.body.token));

    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Grace Hopper');
    expect(res.body.user.role).toBe('USER');
  });

  it('rejects /me without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects a valid JWT after the user is deleted', async () => {
    const { res: created } = await registerUser(app);
    await User.deleteOne({ _id: created.body.user.id });

    const res = await request(app).get('/api/auth/me').set(authHeader(created.body.token));
    expect(res.status).toBe(401);
  });

  it('loads role from the database, not from a forged JWT payload', async () => {
    const { res: created } = await registerUser(app);
    const forged = jwt.sign(
      { id: created.body.user.id, email: created.body.user.email, role: 'ADMIN' },
      'test-jwt-secret-for-vitest',
      { expiresIn: '1h' }
    );

    const me = await request(app).get('/api/auth/me').set(authHeader(forged));
    expect(me.status).toBe(200);
    expect(me.body.user.role).toBe('USER');

    const admin = await request(app).get('/api/admin/overview').set(authHeader(forged));
    expect(admin.status).toBe(403);
  });
});
