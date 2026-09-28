import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../app.js';
import { authHeader, registerUser } from './helpers.js';

const sampleIncome = {
  amount: 50000,
  source: 'Salary',
  date: '2026-09-01',
  incomeType: 'Salary',
  description: 'September pay',
  recurring: true,
};

describe('income CRUD and isolation', () => {
  it('requires auth', async () => {
    const res = await request(app).get('/api/income');
    expect(res.status).toBe(401);
  });

  it('creates, lists, updates, and deletes an income row', async () => {
    const { res: createdUser } = await registerUser(app);
    const token = createdUser.body.token;

    const created = await request(app).post('/api/income').set(authHeader(token)).send(sampleIncome);
    expect(created.status).toBe(201);
    expect(created.body.income.amount).toBe(50000);
    expect(created.body.income.source).toBe('Salary');
    const id = created.body.income.id as string;

    const listed = await request(app).get('/api/income').set(authHeader(token));
    expect(listed.status).toBe(200);
    expect(listed.body.count).toBe(1);
    expect(listed.body.totalAmount).toBe(50000);
    expect(listed.body.incomes[0].id).toBe(id);

    const shown = await request(app).get(`/api/income/${id}`).set(authHeader(token));
    expect(shown.status).toBe(200);
    expect(shown.body.income.id).toBe(id);

    const updated = await request(app)
      .patch(`/api/income/${id}`)
      .set(authHeader(token))
      .send({ amount: 55000, source: 'Bonus' });
    expect(updated.status).toBe(200);
    expect(updated.body.income.amount).toBe(55000);
    expect(updated.body.income.source).toBe('Bonus');

    const removed = await request(app).delete(`/api/income/${id}`).set(authHeader(token));
    expect(removed.status).toBe(200);

    const missing = await request(app).get(`/api/income/${id}`).set(authHeader(token));
    expect(missing.status).toBe(404);
  });

  it('rejects invalid create payloads', async () => {
    const { res: createdUser } = await registerUser(app);
    const res = await request(app)
      .post('/api/income')
      .set(authHeader(createdUser.body.token))
      .send({ amount: -1, source: 'X', date: 'not-a-date', incomeType: 'Salary' });

    expect(res.status).toBe(400);
  });

  it('does not let another user read, change, or list someone else\'s income', async () => {
    const { res: owner } = await registerUser(app, { name: 'Owner' });
    const { res: other } = await registerUser(app, { name: 'Other' });

    const created = await request(app)
      .post('/api/income')
      .set(authHeader(owner.body.token))
      .send(sampleIncome);
    const id = created.body.income.id as string;

    const listed = await request(app).get('/api/income').set(authHeader(other.body.token));
    expect(listed.status).toBe(200);
    expect(listed.body.count).toBe(0);
    expect(listed.body.incomes).toEqual([]);

    const shown = await request(app).get(`/api/income/${id}`).set(authHeader(other.body.token));
    expect(shown.status).toBe(404);

    const updated = await request(app)
      .patch(`/api/income/${id}`)
      .set(authHeader(other.body.token))
      .send({ amount: 1 });
    expect(updated.status).toBe(404);

    const removed = await request(app).delete(`/api/income/${id}`).set(authHeader(other.body.token));
    expect(removed.status).toBe(404);

    const stillThere = await request(app).get(`/api/income/${id}`).set(authHeader(owner.body.token));
    expect(stillThere.status).toBe(200);
    expect(stillThere.body.income.amount).toBe(50000);
  });
});
