import { isDatabaseConnected } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import { Expense, IExpense } from '../expense/expense.model.js';
import { Income } from '../income/income.model.js';

export type SubscriptionItem = {
  id: string;
  merchant: string;
  category: string;
  amount: number;
  frequency: 'Monthly' | 'Yearly' | 'Weekly' | 'Quarterly';
  monthlyEquivalent: number;
  annualEquivalent: number;
  lastCharged: string;
  nextExpectedDate: string;
  status: 'ACTIVE' | 'INCREASED' | 'PAUSED';
  priceChangeAlert?: string;
};

export type SubscriptionsSummary = {
  subscriptions: SubscriptionItem[];
  totalMonthlyCommitments: number;
  totalAnnualCommitments: number;
  activeCount: number;
  priceIncreaseAlerts: string[];
};

function assertDatabase() {
  if (!isDatabaseConnected()) {
    throw new AppError('Database is not connected.', 503);
  }
}

export async function getSubscriptionsAnalysis(userId: string): Promise<SubscriptionsSummary> {
  assertDatabase();

  const expenses = await Expense.find({
    userId,
    $or: [{ recurring: true }, { category: { $in: ['Bills', 'Utilities', 'Rent', 'Entertainment', 'Subscription'] } }],
  })
    .sort({ date: -1 })
    .lean();

  const grouped = new Map<string, IExpense[]>();

  for (const exp of expenses) {
    const key = (exp.description || exp.category || 'Subscription').trim().toLowerCase();
    const list = grouped.get(key) || [];
    list.push(exp as unknown as IExpense);
    grouped.set(key, list);
  }

  const subscriptions: SubscriptionItem[] = [];
  const priceIncreaseAlerts: string[] = [];

  for (const [key, items] of grouped.entries()) {
    if (items.length === 0) continue;
    const latest = items[0];
    const merchantName = latest.description || latest.category || key;

    const previous = items[1];
    let priceAlert: string | undefined;
    let status: SubscriptionItem['status'] = 'ACTIVE';

    if (previous && latest.amount > previous.amount * 1.05) {
      const diff = latest.amount - previous.amount;
      priceAlert = `${merchantName} increased from Rs. ${previous.amount.toLocaleString()} to Rs. ${latest.amount.toLocaleString()} (+Rs. ${diff.toLocaleString()}).`;
      priceIncreaseAlerts.push(priceAlert);
      status = 'INCREASED';
    }

    const lastDate = new Date(latest.date);
    const nextDate = new Date(lastDate);
    nextDate.setMonth(nextDate.getMonth() + 1);

    const monthlyEq = latest.amount;
    const annualEq = latest.amount * 12;

    subscriptions.push({
      id: String(latest._id),
      merchant: merchantName,
      category: latest.category,
      amount: latest.amount,
      frequency: 'Monthly',
      monthlyEquivalent: monthlyEq,
      annualEquivalent: annualEq,
      lastCharged: lastDate.toISOString().slice(0, 10),
      nextExpectedDate: nextDate.toISOString().slice(0, 10),
      status,
      priceChangeAlert: priceAlert,
    });
  }

  const totalMonthly = subscriptions.reduce((sum, item) => sum + item.monthlyEquivalent, 0);
  const totalAnnual = subscriptions.reduce((sum, item) => sum + item.annualEquivalent, 0);

  return {
    subscriptions,
    totalMonthlyCommitments: totalMonthly,
    totalAnnualCommitments: totalAnnual,
    activeCount: subscriptions.length,
    priceIncreaseAlerts,
  };
}
