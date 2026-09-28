import { z } from 'zod';
import { AppError } from '../../utils/AppError.js';
import { isDatabaseConnected } from '../../config/db.js';
import { Expense } from '../expense/expense.model.js';

const importSchema = z.object({
  rows: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        amount: z.coerce.number().positive(),
        description: z.string().trim().min(2).max(240),
      })
    )
    .min(1, 'Choose at least one statement line.'),
});

export type StatementLine = {
  date: string;
  amount: number;
  description: string;
};

export type ReconcileMatch = {
  statement: StatementLine;
  expenseId: string;
  expenseDescription: string;
  expenseDate: string;
  score: number;
};

function assertDatabase() {
  if (!isDatabaseConnected()) {
    throw new AppError('Database is not connected. Try again in a moment.', 503);
  }
}

function splitCsv(line: string) {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (const char of line) {
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === ',' && !quoted) {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function parseDate(value: string) {
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }
  return null;
}

function dayDistance(left: string, right: string) {
  const a = Date.parse(`${left}T00:00:00Z`);
  const b = Date.parse(`${right}T00:00:00Z`);
  return Math.abs(a - b) / 86_400_000;
}

function tokenScore(left: string, right: string) {
  const words = new Set(left.toLowerCase().split(/\W+/).filter((word) => word.length > 2));
  if (words.size === 0) return 0;
  const other = right.toLowerCase();
  let hits = 0;
  for (const word of words) {
    if (other.includes(word)) hits += 1;
  }
  return hits / words.size;
}

export function parseStatement(csv: string): StatementLine[] {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    throw new AppError('The statement is empty.', 400);
  }
  const header = splitCsv(lines[0]).map((cell) => cell.toLowerCase());
  const dateIndex = header.findIndex((cell) => /date/.test(cell));
  const amountIndex = header.findIndex((cell) => /amount|debit|withdrawal/.test(cell));
  const descriptionIndex = header.findIndex((cell) => /desc|narr|detail|merchant|particular/.test(cell));
  const hasHeader = dateIndex >= 0 && amountIndex >= 0;
  const body = hasHeader ? lines.slice(1) : lines;
  const rows: StatementLine[] = [];
  for (const line of body) {
    const cells = splitCsv(line);
    const date = parseDate(hasHeader ? cells[dateIndex] || '' : cells[0] || '');
    const rawAmount = (hasHeader ? cells[amountIndex] : cells[2] || cells[1] || '').replace(/[, ]/g, '');
    const amount = Math.abs(Number(rawAmount));
    const rawDescription = hasHeader && descriptionIndex >= 0 ? cells[descriptionIndex] : cells[1];
    const description = (rawDescription || 'Statement line').trim();
    if (!date || !Number.isFinite(amount) || amount <= 0) continue;
    rows.push({ date, amount: Math.round(amount * 100) / 100, description: description || 'Statement line' });
  }
  if (rows.length === 0) {
    throw new AppError('No statement lines could be read. Use columns date, description, amount.', 400);
  }
  return rows;
}

export async function reconcileStatement(userId: string, csv: string) {
  assertDatabase();
  const statement = parseStatement(csv);
  const dates = statement.map((row) => Date.parse(`${row.date}T00:00:00Z`));
  const from = new Date(Math.min(...dates) - 3 * 86_400_000);
  const to = new Date(Math.max(...dates) + 4 * 86_400_000);
  const expenses = await Expense.find({ userId, date: { $gte: from, $lt: to } }).select('amount date description');
  const used = new Set<string>();
  const matched: ReconcileMatch[] = [];

  for (const line of statement) {
    let best: ReconcileMatch | null = null;
    for (const expense of expenses) {
      const id = String(expense._id);
      if (used.has(id)) continue;
      const expenseDate = expense.date.toISOString().slice(0, 10);
      const days = dayDistance(line.date, expenseDate);
      if (days > 3) continue;
      const amountGap = Math.abs(expense.amount - line.amount);
      if (amountGap > 1 && amountGap / line.amount > 0.01) continue;
      const score = Number((0.7 * (1 - Math.min(amountGap / line.amount, 1)) + 0.2 * (1 - days / 3) + 0.1 * tokenScore(line.description, expense.description)).toFixed(2));
      if (!best || score > best.score) {
        best = {
          statement: line,
          expenseId: id,
          expenseDescription: expense.description,
          expenseDate,
          score,
        };
      }
    }
    if (best) {
      used.add(best.expenseId);
      matched.push(best);
    }
  }

  const matchedKeys = new Set(matched.map((row) => `${row.statement.date}|${row.statement.amount}|${row.statement.description}`));
  const statementOnly = statement.filter((row) => !matchedKeys.has(`${row.date}|${row.amount}|${row.description}`));
  const ledgerOnly = expenses
    .filter((expense) => !used.has(String(expense._id)))
    .map((expense) => ({
      id: String(expense._id),
      date: expense.date.toISOString().slice(0, 10),
      amount: expense.amount,
      description: expense.description,
    }));

  return {
    matched,
    statementOnly,
    ledgerOnly,
    counts: { matched: matched.length, statementOnly: statementOnly.length, ledgerOnly: ledgerOnly.length },
  };
}

export async function importMissing(userId: string, rows: StatementLine[]) {
  assertDatabase();
  const parsed = importSchema.safeParse({ rows });
  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message || 'Those statement lines cannot be imported.', 400);
  }
  const created = await Expense.insertMany(
    parsed.data.rows.map((row) => ({
      userId,
      amount: row.amount,
      category: 'Other',
      date: new Date(`${row.date}T00:00:00.000Z`),
      paymentMethod: 'Bank Transfer',
      description: row.description,
      transactionType: 'NEED',
      recurring: false,
    }))
  );
  return { created: created.length };
}
