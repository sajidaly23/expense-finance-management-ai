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
  if (typeof value === 'number' && Number.isFinite(value)) return Math.abs(value);
  const cleaned = String(value ?? '')
    .replace(/,/g, '')
    .replace(/rs\.?/gi, '')
    .trim();
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? Math.abs(amount) : NaN;
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

function inferCategory(description: string): (typeof EXPENSE_CATEGORIES)[number] {
  const d = description.toLowerCase();
  if (/food|restaurant|kfc|mcdonald|pizza|supermarket|grocery|groceries|dining|cafe|swiggy|foodpanda|bakers|kitchen|eat/i.test(d)) {
    return 'Food';
  }
  if (/fuel|pso|shell|byco|total|attock|petrol|transport|uber|careem|yangos|indrive|cab|ride|ride-sharing|auto|car/i.test(d)) {
    return 'Transport';
  }
  if (/bill|electricity|iesco|lesco|ke|kelectric|gas|sngpl|ssgc|ptcl|fiber|stormfiber|nayatel|water|utility|utilities/i.test(d)) {
    return 'Utilities';
  }
  if (/rent|house|apartment|flat|lease|property/i.test(d)) {
    return 'Rent';
  }
  if (/school|college|uni|university|fee|tuition|course|udemy|coursera|education|academy/i.test(d)) {
    return 'Education';
  }
  if (/hospital|clinic|doctor|pharmacy|medicine|lab|health|medical|dental|pharma/i.test(d)) {
    return 'Healthcare';
  }
  if (/netflix|spotify|youtube|apple|google|amazon|prime|subscription|sub/i.test(d)) {
    return 'Bills';
  }
  if (/mall|daraz|shopping|cloth|store|apparel|brand|outfitters|khaadi|limelight|mart/i.test(d)) {
    return 'Shopping';
  }
  return 'Other';
}

function matchEnum<T extends readonly string[]>(value: unknown, allowed: T, fallback?: T[number]): T[number] | null {
  const text = String(value ?? '').trim();
  if (!text) return fallback ?? null;
  const exact = allowed.find((item) => item.toLowerCase() === text.toLowerCase());
  if (exact) return exact;
  const partial = allowed.find((item) => text.toLowerCase().includes(item.toLowerCase()));
  return partial ?? fallback ?? null;
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

function parseIncomeSheet(sheetName: string, sheet: XLSX.WorkSheet) {
  const rows = sheetRows(sheet);
  if (rows.length === 0) {
    return { incomes: [] as ParsedIncomeRow[], errors: [] as ImportRowError[] };
  }

  const headers = rows[0].map((cell) => String(cell ?? ''));
  const amountIdx = headerIndex(headers, ['amount', 'income', 'value', 'credit', 'deposit']);
  const sourceIdx = headerIndex(headers, ['source', 'incomesource', 'from', 'particulars', 'description', 'details', 'payee']);
  const dateIdx = headerIndex(headers, ['date', 'transactiondate', 'incomedate', 'txndate', 'value date', 'posting date']);
  const typeIdx = headerIndex(headers, ['incometype', 'type', 'category']);
  const descriptionIdx = headerIndex(headers, ['description', 'notes', 'note', 'particulars', 'remarks']);
  const recurringIdx = headerIndex(headers, ['recurring', 'repeat', 'monthly']);

  const incomes: ParsedIncomeRow[] = [];
  const errors: ImportRowError[] = [];
  const today = new Date().toISOString().slice(0, 10);

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row || row.every((cell) => String(cell ?? '').trim() === '')) continue;

    const rowNumber = i + 1;
    const amount = parseAmount(row[amountIdx]);
    const source = String(row[sourceIdx] ?? '').trim() || 'Bank Income Deposit';
    const date = parseDateValue(row[dateIdx]) || today;
    const incomeType = matchEnum(row[typeIdx], INCOME_TYPES, 'Other') || 'Other';
    const description = descriptionIdx >= 0 ? String(row[descriptionIdx] ?? '').trim() : '';
    const recurring = recurringIdx >= 0 ? parseBoolean(row[recurringIdx]) : false;

    if (!Number.isFinite(amount) || amount <= 0) {
      errors.push({ sheet: sheetName, row: rowNumber, message: 'Amount must be a number greater than 0.' });
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
  const amountIdx = headerIndex(headers, ['amount', 'expense', 'value', 'cost', 'debit', 'withdrawal']);
  const descriptionIdx = headerIndex(headers, ['description', 'details', 'note', 'notes', 'particulars', 'remarks', 'narrative', 'payee']);
  const categoryIdx = headerIndex(headers, ['category', 'expensecategory']);
  const subcategoryIdx = headerIndex(headers, ['subcategory', 'subcategoryname']);
  const dateIdx = headerIndex(headers, ['date', 'transactiondate', 'expensedate', 'txndate', 'value date', 'posting date']);
  const paymentIdx = headerIndex(headers, ['paymentmethod', 'payment', 'method']);
  const typeIdx = headerIndex(headers, ['transactiontype', 'needwant', 'needorwant', 'type']);
  const recurringIdx = headerIndex(headers, ['recurring', 'repeat', 'monthly']);

  const expenses: ParsedExpenseRow[] = [];
  const errors: ImportRowError[] = [];
  const today = new Date().toISOString().slice(0, 10);

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row || row.every((cell) => String(cell ?? '').trim() === '')) continue;

    const rowNumber = i + 1;
    const amount = parseAmount(row[amountIdx]);
    const description = String(row[descriptionIdx] ?? '').trim() || 'Bank Expense Payment';
    const category = matchEnum(row[categoryIdx], EXPENSE_CATEGORIES) || inferCategory(description);
    const subcategory = subcategoryIdx >= 0 ? String(row[subcategoryIdx] ?? '').trim() : '';
    const date = parseDateValue(row[dateIdx]) || today;
    const paymentMethod = matchEnum(row[paymentIdx], PAYMENT_METHODS, 'Bank Transfer') || 'Bank Transfer';
    const rawType = String(row[typeIdx] ?? 'NEED').trim().toUpperCase();
    const transactionType =
      rawType === 'WANT' ? 'WANT' : rawType === 'NEED' ? 'NEED' : matchEnum(row[typeIdx], TRANSACTION_TYPES, 'NEED') || 'NEED';
    const recurring = recurringIdx >= 0 ? parseBoolean(row[recurringIdx]) : false;

    if (!Number.isFinite(amount) || amount <= 0) {
      errors.push({ sheet: sheetName, row: rowNumber, message: 'Amount must be a number greater than 0.' });
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

function parseBankStatementSheet(sheetName: string, sheet: XLSX.WorkSheet) {
  const rows = sheetRows(sheet);
  if (rows.length === 0) {
    return { incomes: [] as ParsedIncomeRow[], expenses: [] as ParsedExpenseRow[], errors: [] as ImportRowError[] };
  }

  const headers = rows[0].map((cell) => String(cell ?? ''));
  const dateIdx = headerIndex(headers, ['date', 'transactiondate', 'txndate', 'value date', 'posting date', 'dt']);
  const descIdx = headerIndex(headers, ['description', 'particulars', 'narration', 'details', 'remarks', 'payee', 'narrative']);
  const debitIdx = headerIndex(headers, ['debit', 'withdrawal', 'amount out', 'dr', 'expense']);
  const creditIdx = headerIndex(headers, ['credit', 'deposit', 'amount in', 'cr', 'income']);
  const amountIdx = headerIndex(headers, ['amount', 'txn amount', 'value']);
  const categoryIdx = headerIndex(headers, ['category']);
  const paymentIdx = headerIndex(headers, ['paymentmethod', 'payment', 'method']);

  const incomes: ParsedIncomeRow[] = [];
  const expenses: ParsedExpenseRow[] = [];
  const errors: ImportRowError[] = [];
  const today = new Date().toISOString().slice(0, 10);

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row || row.every((cell) => String(cell ?? '').trim() === '')) continue;

    const rowNumber = i + 1;
    const date = parseDateValue(row[dateIdx]) || today;
    const description = String(row[descIdx] ?? '').trim() || 'Bank Statement Entry';

    const debitVal = debitIdx >= 0 ? parseAmount(row[debitIdx]) : NaN;
    const creditVal = creditIdx >= 0 ? parseAmount(row[creditIdx]) : NaN;
    const rawVal = amountIdx >= 0 ? Number(String(row[amountIdx] ?? '').replace(/,/g, '')) : NaN;

    let isDebit = false;
    let isCredit = false;
    let finalAmount = 0;

    if (Number.isFinite(debitVal) && debitVal > 0) {
      isDebit = true;
      finalAmount = debitVal;
    } else if (Number.isFinite(creditVal) && creditVal > 0) {
      isCredit = true;
      finalAmount = creditVal;
    } else if (Number.isFinite(rawVal)) {
      if (rawVal < 0) {
        isDebit = true;
        finalAmount = Math.abs(rawVal);
      } else if (rawVal > 0) {
        isCredit = true;
        finalAmount = rawVal;
      }
    }

    if (finalAmount <= 0) {
      continue;
    }

    if (isDebit) {
      const category = (categoryIdx >= 0 ? matchEnum(row[categoryIdx], EXPENSE_CATEGORIES) : null) || inferCategory(description);
      const paymentMethod = (paymentIdx >= 0 ? matchEnum(row[paymentIdx], PAYMENT_METHODS) : null) || 'Bank Transfer';

      expenses.push({
        row: rowNumber,
        sheet: sheetName,
        amount: finalAmount,
        description,
        category,
        date,
        paymentMethod,
        transactionType: 'NEED',
        recurring: false,
      });
    } else if (isCredit) {
      incomes.push({
        row: rowNumber,
        sheet: sheetName,
        amount: finalAmount,
        source: description || 'Bank Deposit',
        date,
        incomeType: /salary|payroll/i.test(description) ? 'Salary' : 'Other',
        description,
        recurring: false,
      });
    }
  }

  return { incomes, expenses, errors };
}

export function parseWorkbook(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const incomeSheetName = findSheet(workbook, ['Income', 'Incomes']);
  const expenseSheetName = findSheet(workbook, ['Expenses', 'Expense']);

  if (incomeSheetName || expenseSheetName) {
    const incomeResult = incomeSheetName
      ? parseIncomeSheet(incomeSheetName, workbook.Sheets[incomeSheetName])
      : { incomes: [] as ParsedIncomeRow[], errors: [] as ImportRowError[] };
    const expenseResult = expenseSheetName
      ? parseExpenseSheet(expenseSheetName, workbook.Sheets[expenseSheetName])
      : { expenses: [] as ParsedExpenseRow[], errors: [] as ImportRowError[] };

    return {
      incomes: incomeResult.incomes,
      expenses: expenseResult.expenses,
      errors: [...incomeResult.errors, ...expenseResult.errors],
    };
  }

  // Parse standard bank statement or generic single sheet
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) {
    return {
      incomes: [],
      expenses: [],
      errors: [{ sheet: 'Workbook', row: 0, message: 'The file has no sheets.' }],
    };
  }

  const sheet = workbook.Sheets[firstSheet];
  const bankResult = parseBankStatementSheet(firstSheet, sheet);

  if (bankResult.incomes.length > 0 || bankResult.expenses.length > 0) {
    return bankResult;
  }

  // Fallback to expense probe or income probe
  const expenseProbe = parseExpenseSheet(firstSheet, sheet);
  if (expenseProbe.expenses.length > 0) {
    return { incomes: [], expenses: expenseProbe.expenses, errors: expenseProbe.errors };
  }

  const incomeProbe = parseIncomeSheet(firstSheet, sheet);
  if (incomeProbe.incomes.length > 0) {
    return { incomes: incomeProbe.incomes, expenses: [], errors: incomeProbe.errors };
  }

  return {
    incomes: [],
    expenses: [],
    errors: [
      {
        sheet: firstSheet,
        row: 0,
        message:
          'Could not parse bank statement. Ensure the file contains columns like Date, Description, Debit/Credit or Amount.',
      },
    ],
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
