import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../app.js';
import { authHeader, registerUser } from './helpers.js';

const sampleExpense = {
  amount: 1200,
  category: 'Food',
  date: '2026-09-02',
  paymentMethod: 'Cash',
  description: 'Lunch',
  transactionType: 'NEED',
};

describe('expense CRUD and isolation', () => {
  it('requires auth', async () => {
    const res = await request(app).get('/api/expenses');
    expect(res.status).toBe(401);
  });

  it('creates, lists, updates, and deletes an expense row', async () => {
    const { res: createdUser } = await registerUser(app);
    const token = createdUser.body.token;

    const created = await request(app).post('/api/expenses').set(authHeader(token)).send(sampleExpense);
    expect(created.status).toBe(201);
    expect(created.body.expense.amount).toBe(1200);
    expect(created.body.expense.category).toBe('Food');
    const id = created.body.expense.id as string;

    const listed = await request(app).get('/api/expenses').set(authHeader(token));
    expect(listed.status).toBe(200);
    expect(listed.body.count).toBe(1);
    expect(listed.body.totalAmount).toBe(1200);
    expect(listed.body.needsTotal).toBe(1200);
    expect(listed.body.expenses[0].id).toBe(id);

    const shown = await request(app).get(`/api/expenses/${id}`).set(authHeader(token));
    expect(shown.status).toBe(200);
    expect(shown.body.expense.description).toBe('Lunch');

    const updated = await request(app)
      .patch(`/api/expenses/${id}`)
      .set(authHeader(token))
      .send({ amount: 1500, description: 'Dinner' });
    expect(updated.status).toBe(200);
    expect(updated.body.expense.amount).toBe(1500);
    expect(updated.body.expense.description).toBe('Dinner');

    const removed = await request(app).delete(`/api/expenses/${id}`).set(authHeader(token));
    expect(removed.status).toBe(200);

    const missing = await request(app).get(`/api/expenses/${id}`).set(authHeader(token));
    expect(missing.status).toBe(404);
  });

  it('rejects invalid create payloads', async () => {
    const { res: createdUser } = await registerUser(app);
    const res = await request(app)
      .post('/api/expenses')
      .set(authHeader(createdUser.body.token))
      .send({ amount: 10, category: 'NotACategory', date: '2026-09-02', paymentMethod: 'Cash', description: 'X', transactionType: 'NEED' });

    expect(res.status).toBe(400);
  });

  it('does not let another user read, change, or list someone else\'s expense', async () => {
    const { res: owner } = await registerUser(app, { name: 'Owner' });
    const { res: other } = await registerUser(app, { name: 'Other' });

    const created = await request(app)
      .post('/api/expenses')
      .set(authHeader(owner.body.token))
      .send(sampleExpense);
    const id = created.body.expense.id as string;

    const listed = await request(app).get('/api/expenses').set(authHeader(other.body.token));
    expect(listed.status).toBe(200);
    expect(listed.body.count).toBe(0);
    expect(listed.body.expenses).toEqual([]);

    const shown = await request(app).get(`/api/expenses/${id}`).set(authHeader(other.body.token));
    expect(shown.status).toBe(404);

    const updated = await request(app)
      .patch(`/api/expenses/${id}`)
      .set(authHeader(other.body.token))
      .send({ amount: 9 });
    expect(updated.status).toBe(404);

    const removed = await request(app).delete(`/api/expenses/${id}`).set(authHeader(other.body.token));
    expect(removed.status).toBe(404);

    const stillThere = await request(app).get(`/api/expenses/${id}`).set(authHeader(owner.body.token));
    expect(stillThere.status).toBe(200);
    expect(stillThere.body.expense.amount).toBe(1200);
  });
});
