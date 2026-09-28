import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../app.js';
import { authHeader, registerUser } from './helpers.js';

async function seedFinancialData(token: string) {
  await request(app)
    .post('/api/income')
    .set(authHeader(token))
    .send({
      amount: 300000,
      source: 'Employer',
      date: '2026-08-05',
      incomeType: 'Salary',
      description: 'August salary 1',
      recurring: false,
    });

  await request(app)
    .post('/api/income')
    .set(authHeader(token))
    .send({
      amount: 300000,
      source: 'Employer',
      date: '2026-08-20',
      incomeType: 'Salary',
      description: 'August salary 2',
      recurring: false,
    });

  await request(app)
    .post('/api/income')
    .set(authHeader(token))
    .send({
      amount: 270000,
      source: 'Employer',
      date: '2026-09-01',
      incomeType: 'Salary',
      description: 'September salary',
      recurring: false,
    });

  const augustRent = await request(app)
    .post('/api/expenses')
    .set(authHeader(token))
    .send({
      amount: 120000,
      category: 'Rent',
      date: '2026-08-03',
      paymentMethod: 'Bank Transfer',
      description: 'August rent',
      transactionType: 'NEED',
    });
  expect(augustRent.status).toBe(201);

  const augustFood = await request(app)
    .post('/api/expenses')
    .set(authHeader(token))
    .send({
      amount: 82000,
      category: 'Food',
      date: '2026-08-12',
      paymentMethod: 'Cash',
      description: 'August groceries',
      transactionType: 'NEED',
    });
  expect(augustFood.status).toBe(201);

  const septemberFood = await request(app)
    .post('/api/expenses')
    .set(authHeader(token))
    .send({
      amount: 251000,
      category: 'Food',
      date: '2026-09-10',
      paymentMethod: 'Cash',
      description: 'September groceries',
      transactionType: 'NEED',
    });
  expect(septemberFood.status).toBe(201);
}

describe('assistant financial intelligence', () => {
  it('requires auth', async () => {
    const res = await request(app).post('/api/assistant/ask').send({ question: 'hello' });
    expect(res.status).toBe(401);
  });

  it('answers August expense query correctly', async () => {
    const { res: userRes } = await registerUser(app, { name: 'Assistant User' });
    const token = userRes.body.token as string;
    await seedFinancialData(token);

    const res = await request(app)
      .post('/api/assistant/ask')
      .set(authHeader(token))
      .send({ question: 'give me a august expense', useOllama: false });

    expect(res.status).toBe(200);
    expect(res.body.answer).toMatch(/August 2026/i);
    expect(res.body.answer).toMatch(/202,000|Rs\. 202,000/);
    expect(res.body.answer.toLowerCase()).toContain('expense');
    expect(res.body.answer).not.toMatch(/September/i);
    expect(res.body.source).toBe('SmartFin Assistant');
  });

  it('answers composite August expense and salary count without September income', async () => {
    const { res: userRes } = await registerUser(app, { name: 'Composite User' });
    const token = userRes.body.token as string;
    await seedFinancialData(token);

    const res = await request(app)
      .post('/api/assistant/ask')
      .set(authHeader(token))
      .send({ question: 'give me a august expense and how many salary', useOllama: false });

    expect(res.status).toBe(200);
    expect(res.body.answer).toMatch(/August 2026/i);
    expect(res.body.answer).toMatch(/202,000|Rs\. 202,000/);
    expect(res.body.answer).toMatch(/2 salary transactions/i);
    expect(res.body.answer).not.toMatch(/870,000/);
    expect(res.body.answer).not.toMatch(/September/i);
  });

  it('answers September expense separately from August', async () => {
    const { res: userRes } = await registerUser(app, { name: 'Month User' });
    const token = userRes.body.token as string;
    await seedFinancialData(token);

    const res = await request(app)
      .post('/api/assistant/ask')
      .set(authHeader(token))
      .send({ question: 'how much did I spend in September', useOllama: false });

    expect(res.status).toBe(200);
    expect(res.body.answer).toMatch(/September/i);
    expect(res.body.answer).toMatch(/251,000|Rs\. 251,000/);
  });

  it('answers August salary income amount and count', async () => {
    const { res: userRes } = await registerUser(app, { name: 'Salary User' });
    const token = userRes.body.token as string;
    await seedFinancialData(token);

    const res = await request(app)
      .post('/api/assistant/ask')
      .set(authHeader(token))
      .send({ question: 'how much salary did I receive in August', useOllama: false });

    expect(res.status).toBe(200);
    expect(res.body.answer).toMatch(/600,000|Rs\. 600,000/);
    expect(res.body.answer).toMatch(/2 transactions/i);
    expect(res.body.answer).toMatch(/August 2026/i);
  });

  it('answers food category for August', async () => {
    const { res: userRes } = await registerUser(app, { name: 'Food User' });
    const token = userRes.body.token as string;
    await seedFinancialData(token);

    const res = await request(app)
      .post('/api/assistant/ask')
      .set(authHeader(token))
      .send({ question: 'how much did I spend on food in August', useOllama: false });

    expect(res.status).toBe(200);
    expect(res.body.answer).toMatch(/82,000|Rs\. 82,000/);
    expect(res.body.answer).toMatch(/Food/i);
  });

  it('answers net savings for August', async () => {
    const { res: userRes } = await registerUser(app, { name: 'Savings User' });
    const token = userRes.body.token as string;
    await seedFinancialData(token);

    const res = await request(app)
      .post('/api/assistant/ask')
      .set(authHeader(token))
      .send({ question: 'how much did I save in August', useOllama: false });

    expect(res.status).toBe(200);
    expect(res.body.answer).toMatch(/398,000|Rs\. 398,000/);
  });

  it('works when Ollama is disabled and does not expose internal engine labels', async () => {
    const { res: userRes } = await registerUser(app, { name: 'Offline User' });
    const token = userRes.body.token as string;
    await seedFinancialData(token);

    const res = await request(app)
      .post('/api/assistant/ask')
      .set(authHeader(token))
      .send({ question: 'how much did I spend this month', useOllama: false });

    expect(res.status).toBe(200);
    expect(res.body.source).toBe('SmartFin Assistant');
    expect(res.body.source).not.toMatch(/Ollama unavailable/i);
    expect(res.body.answer).toMatch(/251,000|Rs\. 251,000/);
  });

  it('handles empty transaction data gracefully', async () => {
    const { res: userRes } = await registerUser(app, { name: 'Empty User' });
    const token = userRes.body.token as string;

    const res = await request(app)
      .post('/api/assistant/ask')
      .set(authHeader(token))
      .send({ question: 'how much did I spend in August', useOllama: false });

    expect(res.status).toBe(200);
    expect(res.body.answer).toMatch(/No expenses are recorded for August 2026/i);
  });

  it('does not leak another user financial data', async () => {
    const { res: ownerRes } = await registerUser(app, { name: 'Owner' });
    const { res: otherRes } = await registerUser(app, { name: 'Other' });
    const ownerToken = ownerRes.body.token as string;
    const otherToken = otherRes.body.token as string;

    await seedFinancialData(ownerToken);

    const res = await request(app)
      .post('/api/assistant/ask')
      .set(authHeader(otherToken))
      .send({ question: 'give me a august expense', useOllama: false });

    expect(res.status).toBe(200);
    expect(res.body.answer).toMatch(/No expenses are recorded for August 2026/i);
    expect(res.body.answer).not.toMatch(/202,000/);
  });

  it('answers financial education without personal data leakage', async () => {
    const { res: userRes } = await registerUser(app, { name: 'Education User' });
    const token = userRes.body.token as string;
    await seedFinancialData(token);

    const res = await request(app)
      .post('/api/assistant/ask')
      .set(authHeader(token))
      .send({ question: 'What is an emergency fund?', useOllama: false });

    expect(res.status).toBe(200);
    expect(res.body.source).toBe('Financial Education');
    expect(res.body.answer.toLowerCase()).toContain('emergency fund');
    expect(res.body.answer).not.toMatch(/870,000|453,000/);
  });

  it('answers last month top spending phrasing', async () => {
    const { res: userRes } = await registerUser(app, { name: 'Most Spend User' });
    const token = userRes.body.token as string;
    await seedFinancialData(token);

    const res = await request(app)
      .post('/api/assistant/ask')
      .set(authHeader(token))
      .send({ question: 'where my last month money used mostly', useOllama: false, history: [] });

    expect(res.status).toBe(200);
    expect(res.body.answer).toMatch(/August 2026/i);
    expect(res.body.answer).toMatch(/Food|Rent/i);
  });

  it('handles expense follow-up why and category driver', async () => {
    const { res: userRes } = await registerUser(app, { name: 'Follow Up User' });
    const token = userRes.body.token as string;
    await seedFinancialData(token);

    const first = await request(app)
      .post('/api/assistant/ask')
      .set(authHeader(token))
      .send({ question: 'How much did I spend last month?', useOllama: false, history: [] });

    expect(first.status).toBe(200);
    expect(first.body.answer).toMatch(/August 2026/i);

    const history = first.body.messages.map((m: { role: string; text: string }) => ({
      role: m.role,
      text: m.text,
    }));

    const why = await request(app)
      .post('/api/assistant/ask')
      .set(authHeader(token))
      .send({ question: 'Why?', useOllama: false, history });

    expect(why.status).toBe(200);
    expect(why.body.answer.toLowerCase()).toMatch(/increased|decreased/);

    const driver = await request(app)
      .post('/api/assistant/ask')
      .set(authHeader(token))
      .send({ question: 'Which category caused it?', useOllama: false, history: [...history, ...why.body.messages.slice(-2).map((m: { role: string; text: string }) => ({ role: m.role, text: m.text }))] });

    expect(driver.status).toBe(200);
    expect(driver.body.answer).toMatch(/category|Food|Rent/i);
  });

  it('handles food follow-up for last month', async () => {
    const { res: userRes } = await registerUser(app, { name: 'Food Follow Up' });
    const token = userRes.body.token as string;
    await seedFinancialData(token);

    const first = await request(app)
      .post('/api/assistant/ask')
      .set(authHeader(token))
      .send({ question: 'How much did I spend on food this month?', useOllama: false, history: [] });

    expect(first.status).toBe(200);
    expect(first.body.answer).toMatch(/Food/i);

    const history = first.body.messages.map((m: { role: string; text: string }) => ({
      role: m.role,
      text: m.text,
    }));

    const second = await request(app)
      .post('/api/assistant/ask')
      .set(authHeader(token))
      .send({ question: 'What about last month?', useOllama: false, history });

    expect(second.status).toBe(200);
    expect(second.body.answer).toMatch(/August 2026/i);
    expect(second.body.answer).toMatch(/82,000|Rs\. 82,000/);
  });

  it('compares August and September expenses', async () => {
    const { res: userRes } = await registerUser(app, { name: 'Compare User' });
    const token = userRes.body.token as string;
    await seedFinancialData(token);

    const res = await request(app)
      .post('/api/assistant/ask')
      .set(authHeader(token))
      .send({ question: 'compare August and September expenses', useOllama: false });

    expect(res.status).toBe(200);
    expect(res.body.answer).toMatch(/August 2026/i);
    expect(res.body.answer).toMatch(/September/i);
    expect(res.body.answer).toMatch(/202,000|Rs\. 202,000/);
    expect(res.body.answer).toMatch(/251,000|Rs\. 251,000/);
  });

  it('answers what-if income increase with recorded calculations', async () => {
    const { res: userRes } = await registerUser(app, { name: 'What If User' });
    const token = userRes.body.token as string;
    await seedFinancialData(token);

    const res = await request(app)
      .post('/api/assistant/ask')
      .set(authHeader(token))
      .send({ question: 'What if my salary increases by 20%?', useOllama: false });

    expect(res.status).toBe(200);
    expect(res.body.answer).toMatch(/Based on the financial information currently recorded in SmartFin/i);
    expect(res.body.answer).toMatch(/270,000|Rs\. 270,000/);
    expect(res.body.answer).toMatch(/324,000|Rs\. 324,000/);
    expect(res.body.source).toBe('SmartFin What-If Analysis');
  });

  it('answers affordability with recorded calculations', async () => {
    const { res: userRes } = await registerUser(app, { name: 'Afford User' });
    const token = userRes.body.token as string;
    await seedFinancialData(token);

    const res = await request(app)
      .post('/api/assistant/ask')
      .set(authHeader(token))
      .send({ question: 'Can I afford a laptop for Rs. 150,000?', useOllama: false });

    expect(res.status).toBe(200);
    expect(res.body.answer).toMatch(/Based on the financial information currently recorded in SmartFin/i);
    expect(res.body.answer).toMatch(/150,000|Rs\. 150,000/);
    expect(res.body.answer).toMatch(/Purchase impact/i);
    expect(res.body.source).toBe('SmartFin What-If Analysis');
  });
});
