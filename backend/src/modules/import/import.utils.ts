import * as XLSX from 'xlsx';
import { INCOME_TYPES } from '../income/income.model.js';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, TRANSACTION_TYPES } from '../expense/expense.model.js';

export type ParsedIncomeRow = {
  row: number;
  sheet: string;
  amount: number;
  source: string;
  date: string;
  incomeType: (typeof INCOME_TYPES)[number];
  description?: string;
  recurring: boolean;
};

export type ParsedExpenseRow = {
  row: number;
  sheet: string;
  amount: number;
  description: string;
  category: (typeof EXPENSE_CATEGORIES)[number];
  subcategory?: string;
  date: string;
  paymentMethod: (typeof PAYMENT_METHODS)[number];
  transactionType: (typeof TRANSACTION_TYPES)[number];
  recurring: boolean;
};

export type ImportRowError = {
  sheet: string;
  row: number;
  message: string;
};

function normalizeHeader(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}

function headerIndex(headers: string[], aliases: string[]) {
  const normalized = headers.map(normalizeHeader);
  for (const alias of aliases) {
    const index = normalized.indexOf(normalizeHeader(alias));
    if (index >= 0) return index;
  }
  return -1;
}

function parseBoolean(value: unknown) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  const text = String(value ?? '')
    .trim()
    .toLowerCase();
  return text === 'true' || text === 'yes' || text === 'y' || text === '1';
}

function parseAmount(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const cleaned = String(value ?? '')
    .replace(/,/g, '')
    .replace(/rs\.?/gi, '')
    .trim();
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? amount : NaN;
}

export function parseDateValue(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
    }
  }
  const text = String(value ?? '').trim();
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const slash = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slash) {
    const [, day, month, year] = slash;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

function matchEnum<T extends readonly string[]>(value: unknown, allowed: T, fallback?: T[number]): T[number] | null {
  const text = String(value ?? '').trim();
  if (!text) return fallback ?? null;
  const exact = allowed.find((item) => item.toLowerCase() === text.toLowerCase());
  if (exact) return exact;
  const partial = allowed.find((item) => text.toLowerCase().includes(item.toLowerCase()));
  return partial ?? null;
}

function sheetRows(sheet: XLSX.WorkSheet) {
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: true,
  }) as unknown[][];
}

function findSheet(workbook: XLSX.WorkBook, names: string[]) {
  const target = names.map((name) => name.toLowerCase());
  return workbook.SheetNames.find((name) => target.includes(name.toLowerCase()));
}

function detectSheetKind(headers: string[]) {
  const normalized = headers.map(normalizeHeader);
  const has = (aliases: string[]) => aliases.some((alias) => normalized.includes(normalizeHeader(alias)));

  if (has(['incometype', 'income type'])) return 'income';
  if (has(['category', 'paymentmethod', 'payment method', 'transactiontype', 'transaction type'])) {
    return 'expense';
  }
  if (has(['source']) && !has(['category'])) return 'income';
  if (has(['description']) && has(['category'])) return 'expense';
  return 'unknown';
}

function parseIncomeSheet(sheetName: string, sheet: XLSX.WorkSheet) {
  const rows = sheetRows(sheet);
  if (rows.length === 0) {
    return { incomes: [] as ParsedIncomeRow[], errors: [] as ImportRowError[] };
  }

  const headers = rows[0].map((cell) => String(cell ?? ''));
  const amountIdx = headerIndex(headers, ['amount', 'income', 'value']);
  const sourceIdx = headerIndex(headers, ['source', 'incomesource', 'from']);
  const dateIdx = headerIndex(headers, ['date', 'transactiondate', 'incomedate']);
  const typeIdx = headerIndex(headers, ['incometype', 'type', 'category']);
  const descriptionIdx = headerIndex(headers, ['description', 'notes', 'note']);
  const recurringIdx = headerIndex(headers, ['recurring', 'repeat', 'monthly']);

  const incomes: ParsedIncomeRow[] = [];
  const errors: ImportRowError[] = [];

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row || row.every((cell) => String(cell ?? '').trim() === '')) continue;

    const rowNumber = i + 1;
    const amount = parseAmount(row[amountIdx]);
    const source = String(row[sourceIdx] ?? '').trim();
    const date = parseDateValue(row[dateIdx]);
    const incomeType = matchEnum(row[typeIdx], INCOME_TYPES);
    const description = descriptionIdx >= 0 ? String(row[descriptionIdx] ?? '').trim() : '';
    const recurring = recurringIdx >= 0 ? parseBoolean(row[recurringIdx]) : false;

    if (!Number.isFinite(amount) || amount <= 0) {
      errors.push({ sheet: sheetName, row: rowNumber, message: 'Amount must be a number greater than 0.' });
      continue;
    }
    if (source.length < 2) {
      errors.push({ sheet: sheetName, row: rowNumber, message: 'Source must be at least 2 characters.' });
      continue;
    }
    if (!date) {
      errors.push({ sheet: sheetName, row: rowNumber, message: 'Date must be YYYY-MM-DD or a valid Excel date.' });
      continue;
    }
    if (!incomeType) {
      errors.push({ sheet: sheetName, row: rowNumber, message: `Income type must be one of: ${INCOME_TYPES.join(', ')}.` });
      continue;
    }

    incomes.push({
      row: rowNumber,
      sheet: sheetName,
      amount,
      source,
      date,
      incomeType,
      description: description || undefined,
      recurring,
    });
  }

  return { incomes, errors };
}

function parseExpenseSheet(sheetName: string, sheet: XLSX.WorkSheet) {
  const rows = sheetRows(sheet);
  if (rows.length === 0) {
    return { expenses: [] as ParsedExpenseRow[], errors: [] as ImportRowError[] };
  }

  const headers = rows[0].map((cell) => String(cell ?? ''));
  const amountIdx = headerIndex(headers, ['amount', 'expense', 'value', 'cost']);
  const descriptionIdx = headerIndex(headers, ['description', 'details', 'note', 'notes']);
  const categoryIdx = headerIndex(headers, ['category', 'expensecategory']);
  const subcategoryIdx = headerIndex(headers, ['subcategory', 'subcategoryname']);
  const dateIdx = headerIndex(headers, ['date', 'transactiondate', 'expensedate']);
  const paymentIdx = headerIndex(headers, ['paymentmethod', 'payment', 'method']);
  const typeIdx = headerIndex(headers, ['transactiontype', 'needwant', 'needorwant', 'type']);
  const recurringIdx = headerIndex(headers, ['recurring', 'repeat', 'monthly']);

  const expenses: ParsedExpenseRow[] = [];
  const errors: ImportRowError[] = [];

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row || row.every((cell) => String(cell ?? '').trim() === '')) continue;

    const rowNumber = i + 1;
    const amount = parseAmount(row[amountIdx]);
    const description = String(row[descriptionIdx] ?? '').trim();
    const category = matchEnum(row[categoryIdx], EXPENSE_CATEGORIES);
    const subcategory = subcategoryIdx >= 0 ? String(row[subcategoryIdx] ?? '').trim() : '';
    const date = parseDateValue(row[dateIdx]);
    const paymentMethod = matchEnum(row[paymentIdx], PAYMENT_METHODS);
    const rawType = String(row[typeIdx] ?? 'NEED').trim().toUpperCase();
    const transactionType =
      rawType === 'WANT' ? 'WANT' : rawType === 'NEED' ? 'NEED' : matchEnum(row[typeIdx], TRANSACTION_TYPES, 'NEED');
    const recurring = recurringIdx >= 0 ? parseBoolean(row[recurringIdx]) : false;

    if (!Number.isFinite(amount) || amount <= 0) {
      errors.push({ sheet: sheetName, row: rowNumber, message: 'Amount must be a number greater than 0.' });
      continue;
    }
    if (description.length < 2) {
      errors.push({ sheet: sheetName, row: rowNumber, message: 'Description must be at least 2 characters.' });
      continue;
    }
    if (!category) {
      errors.push({ sheet: sheetName, row: rowNumber, message: `Category must be one of: ${EXPENSE_CATEGORIES.join(', ')}.` });
      continue;
    }
    if (!date) {
      errors.push({ sheet: sheetName, row: rowNumber, message: 'Date must be YYYY-MM-DD or a valid Excel date.' });
      continue;
    }
    if (!paymentMethod) {
      errors.push({ sheet: sheetName, row: rowNumber, message: `Payment method must be one of: ${PAYMENT_METHODS.join(', ')}.` });
      continue;
    }
    if (!transactionType) {
      errors.push({ sheet: sheetName, row: rowNumber, message: 'Transaction type must be NEED or WANT.' });
      continue;
    }

    expenses.push({
      row: rowNumber,
      sheet: sheetName,
      amount,
      description,
      category,
      subcategory: subcategory || undefined,
      date,
      paymentMethod,
      transactionType,
      recurring,
    });
  }

  return { expenses, errors };
}

export function parseWorkbook(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const incomeSheetName = findSheet(workbook, ['Income', 'Incomes']);
  const expenseSheetName = findSheet(workbook, ['Expenses', 'Expense']);

  const incomeResult = incomeSheetName
    ? parseIncomeSheet(incomeSheetName, workbook.Sheets[incomeSheetName])
    : { incomes: [] as ParsedIncomeRow[], errors: [] as ImportRowError[] };
  const expenseResult = expenseSheetName
    ? parseExpenseSheet(expenseSheetName, workbook.Sheets[expenseSheetName])
    : { expenses: [] as ParsedExpenseRow[], errors: [] as ImportRowError[] };

  if (!incomeSheetName && !expenseSheetName) {
    const firstSheet = workbook.SheetNames[0];
    if (!firstSheet) {
      return {
        incomes: [],
        expenses: [],
        errors: [{ sheet: 'Workbook', row: 0, message: 'The file has no sheets.' }],
      };
    }
    const sheet = workbook.Sheets[firstSheet];
    const headers = sheetRows(sheet)[0]?.map((cell) => String(cell ?? '')) ?? [];
    const kind = detectSheetKind(headers);

    if (kind === 'income') {
      const incomeProbe = parseIncomeSheet(firstSheet, sheet);
      return {
        incomes: incomeProbe.incomes,
        expenses: [],
        errors: incomeProbe.errors,
      };
    }

    if (kind === 'expense') {
      const expenseProbe = parseExpenseSheet(firstSheet, sheet);
      return {
        incomes: [],
        expenses: expenseProbe.expenses,
        errors: expenseProbe.errors,
      };
    }

    return {
      incomes: [],
      expenses: [],
      errors: [
        {
          sheet: firstSheet,
          row: 0,
          message:
            'Could not detect sheet type. Use Income columns (amount, source, date, incomeType) or Expense columns (amount, description, category, date, paymentMethod, transactionType).',
        },
      ],
    };
  }

  return {
    incomes: incomeResult.incomes,
    expenses: expenseResult.expenses,
    errors: [...incomeResult.errors, ...expenseResult.errors],
  };
}

export function buildImportTemplateBuffer() {
  const workbook = XLSX.utils.book_new();
  const incomeSheet = XLSX.utils.aoa_to_sheet([
    ['amount', 'source', 'date', 'incomeType', 'description', 'recurring'],
    [90000, 'Job salary', '2026-09-01', 'Salary', 'Monthly salary', 'Yes'],
    [15000, 'Freelance client', '2026-09-15', 'Freelance', 'Website project', 'No'],
  ]);
  const expenseSheet = XLSX.utils.aoa_to_sheet([
    ['amount', 'description', 'category', 'subcategory', 'date', 'paymentMethod', 'transactionType', 'recurring'],
    [12000, 'Groceries', 'Food', 'Supermarket', '2026-09-05', 'Credit Card', 'NEED', 'No'],
    [4500, 'Uber rides', 'Transport', 'Ride share', '2026-09-08', 'Mobile Wallet', 'NEED', 'No'],
  ]);
  XLSX.utils.book_append_sheet(workbook, incomeSheet, 'Income');
  XLSX.utils.book_append_sheet(workbook, expenseSheet, 'Expenses');
  const data = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return Buffer.from(data);
}

export function buildIncomeCsvTemplate() {
  return [
    'amount,source,date,incomeType,description,recurring',
    '90000,Job salary,2026-09-01,Salary,Monthly salary,Yes',
    '15000,Freelance client,2026-09-15,Freelance,Website project,No',
  ].join('\n');
}

export function buildExpensesCsvTemplate() {
  return [
    'amount,description,category,subcategory,date,paymentMethod,transactionType,recurring',
    '12000,Groceries,Food,Supermarket,2026-09-05,Credit Card,NEED,No',
    '4500,Uber rides,Transport,Ride share,2026-09-08,Mobile Wallet,NEED,No',
  ].join('\n');
}
