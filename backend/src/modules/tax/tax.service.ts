import { AppError } from '../../utils/AppError.js';
import { isDatabaseConnected } from '../../config/db.js';
import { User } from '../auth/user.model.js';
import { Income } from '../income/income.model.js';
import { SavingsGoal } from '../goal/goal.model.js';
import { NetWorthItem } from '../networth/networth.model.js';

const NISAB_ESTIMATE_PKR = 200_000;
const ZAKAT_RATE = 0.025;

const SALARIED_SLABS = [
  { upTo: 600_000, base: 0, rate: 0, over: 0 },
  { upTo: 1_200_000, base: 0, rate: 0.05, over: 600_000 },
  { upTo: 2_200_000, base: 30_000, rate: 0.15, over: 1_200_000 },
  { upTo: 3_200_000, base: 180_000, rate: 0.25, over: 2_200_000 },
  { upTo: 4_100_000, base: 430_000, rate: 0.3, over: 3_200_000 },
  { upTo: Number.POSITIVE_INFINITY, base: 700_000, rate: 0.35, over: 4_100_000 },
];

export type TaxEstimate = {
  taxYear: string;
  taxableIncome: number;
  incomeSource: 'ledger' | 'profile';
  annualTax: number;
  monthlyWithholding: number;
  effectiveRate: number;
  slabSource: string;
  zakatBase: number;
  zakatDue: number;
  nisab: number;
  notes: string[];
};

function assertDatabase() {
  if (!isDatabaseConnected()) {
    throw new AppError('Database is not connected. Try again in a moment.', 503);
  }
}

function taxYearWindow(now = new Date()) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const startYear = month >= 7 ? year : year - 1;
  return {
    label: `${startYear}-${String(startYear + 1).slice(2)}`,
    from: new Date(Date.UTC(startYear, 6, 1)),
    to: new Date(Date.UTC(startYear + 1, 6, 1)),
  };
}

export function salariedTax(annualIncome: number) {
  const income = Math.max(0, annualIncome);
  const slab = SALARIED_SLABS.find((row) => income <= row.upTo) || SALARIED_SLABS[SALARIED_SLABS.length - 1];
  return Math.round(slab.base + Math.max(0, income - slab.over) * slab.rate);
}

export async function estimateTax(userId: string): Promise<TaxEstimate> {
  assertDatabase();
  const window = taxYearWindow();
  const [user, incomes, goals, assets] = await Promise.all([
    User.findById(userId).select('monthlyIncome'),
    Income.find({ userId, date: { $gte: window.from, $lt: window.to } }).select('amount incomeType'),
    SavingsGoal.find({ userId }).select('currentAmount'),
    NetWorthItem.find({ userId, kind: 'asset' }).select('name category value'),
  ]);

  const ledgerIncome = incomes.reduce((sum, row) => sum + row.amount, 0);
  const profileIncome = (user?.monthlyIncome || 0) * 12;
  const incomeSource = ledgerIncome > 0 ? 'ledger' : 'profile';
  const taxableIncome = Math.round(incomeSource === 'ledger' ? ledgerIncome : profileIncome);
  const annualTax = salariedTax(taxableIncome);
  const cashAssets = assets
    .filter((item) => /cash|saving|gold/i.test(`${item.category} ${item.name}`))
    .reduce((sum, item) => sum + item.value, 0);
  const goalSavings = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  const zakatBase = Math.round(cashAssets + goalSavings);
  const zakatDue = zakatBase > NISAB_ESTIMATE_PKR ? Math.round(zakatBase * ZAKAT_RATE) : 0;

  return {
    taxYear: window.label,
    taxableIncome,
    incomeSource,
    annualTax,
    monthlyWithholding: Math.round(annualTax / 12),
    effectiveRate: taxableIncome === 0 ? 0 : Number(((annualTax / taxableIncome) * 100).toFixed(1)),
    slabSource: 'Salaried slab structure used as an estimate for Pakistan tax year planning. Confirm against the current Finance Act before filing.',
    zakatBase,
    zakatDue,
    nisab: NISAB_ESTIMATE_PKR,
    notes: [
      incomeSource === 'ledger'
        ? 'Taxable income is the sum of income entries in the current July–June tax year.'
        : 'No income entries in this tax year, so the profile monthly income was annualized.',
      zakatDue === 0
        ? 'Zakat is 2.5% only when cash, savings, and gold-like assets exceed the estimated nisab.'
        : 'Zakat is 2.5% of cash, savings goals, and assets named as cash, savings, or gold.',
    ],
  };
}
