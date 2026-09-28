import { DateRange } from './date-parser.js';
import {
  MonthTotals,
  SalaryResult,
  LargestExpenseResult,
  RecentTransactionItem,
} from './financial-query.service.js';

export function formatRs(amount: number): string {
  return `Rs. ${Math.round(amount).toLocaleString('en-US')}`;
}

export function formatTotalExpense(
  totals: MonthTotals,
  topCategories?: { category: string; amount: number }[]
): string {
  if (totals.expense === 0) {
    return `I couldn't find any expenses recorded for ${totals.label}.`;
  }

  let reply = `Your total expenses in ${totals.label} were ${formatRs(totals.expense)}.`;

  const top = topCategories || totals.byCategory.slice(0, 3);
  if (top.length > 0) {
    reply += `\n\nTop spending categories:\n${top
      .map((row) => `• ${row.category}: ${formatRs(row.amount)}`)
      .join('\n')}`;
  }

  return reply;
}

export function formatTotalIncome(totals: MonthTotals): string {
  if (totals.income === 0) {
    return `I couldn't find any income recorded for ${totals.label}.`;
  }
  return `Your total income in ${totals.label} was ${formatRs(totals.income)}.`;
}

export function formatNetSavings(totals: MonthTotals): string {
  if (totals.income === 0 && totals.expense === 0) {
    return `There are no transactions recorded for ${totals.label}, so savings cannot be calculated.`;
  }
  if (totals.savings >= 0) {
    return `You saved ${formatRs(totals.savings)} in ${totals.label} (${totals.savingsRate}% of ${formatRs(totals.income)} income, with ${formatRs(totals.expense)} spent).`;
  }
  return `In ${totals.label}, your expenses (${formatRs(totals.expense)}) exceeded your income (${formatRs(totals.income)}) by ${formatRs(Math.abs(totals.savings))}.`;
}

export function formatCategoryExpense(
  category: string,
  amount: number,
  totals: MonthTotals,
  budget?: {
    amount: number;
    spent: number;
    remaining: number;
    utilization: number;
  }
): string {
  if (amount === 0) {
    const budgetBit = budget
      ? ` Your ${category} budget is ${formatRs(budget.amount)} with ${formatRs(budget.remaining)} remaining.`
      : '';
    return `I couldn't find any ${category} expenses recorded for ${totals.label}.${budgetBit}`;
  }

  const share = totals.expense === 0 ? 0 : Number(((amount / totals.expense) * 100).toFixed(1));
  let reply = `You spent ${formatRs(amount)} on ${category} in ${totals.label} (${share}% of your ${formatRs(totals.expense)} total spending).`;

  if (budget) {
    reply += ` Budget: ${formatRs(budget.amount)} (${budget.utilization}% used, ${formatRs(budget.remaining)} remaining).`;
  }

  return reply;
}

export function formatSalaryIncome(result: SalaryResult): string {
  if (result.count === 0) {
    return `I couldn't find any salary income recorded for ${result.label}.`;
  }
  if (result.count === 1) {
    return `You received ${formatRs(result.total)} in salary in ${result.label}.`;
  }
  return `You received ${formatRs(result.total)} in salary across ${result.count} transactions in ${result.label}.`;
}

export function formatSalaryCount(count: number, range: DateRange, total?: number): string {
  if (count === 0) {
    return `You had no salary transactions recorded in ${range.label}.`;
  }
  const countLabel = count === 1 ? '1 salary transaction' : `${count} salary transactions`;
  if (total !== undefined && total > 0) {
    return `You had ${countLabel} in ${range.label}, totalling ${formatRs(total)}.`;
  }
  return `You had ${countLabel} in ${range.label}.`;
}

export function formatTopCategories(totals: MonthTotals, limit = 5): string {
  if (totals.byCategory.length === 0) {
    return `I couldn't find any expenses recorded for ${totals.label}, so there are no spending categories yet.`;
  }

  const top = totals.byCategory.slice(0, limit);
  const leader = top[0];
  const share = totals.expense === 0 ? 0 : Number(((leader.amount / totals.expense) * 100).toFixed(1));

  let reply = `For ${totals.label}, your highest spending category is ${leader.category} at ${formatRs(leader.amount)} (${share}% of ${formatRs(totals.expense)} total expenses).`;

  if (top.length > 1) {
    reply += `\n\nTop categories:\n${top.map((row) => `• ${row.category}: ${formatRs(row.amount)}`).join('\n')}`;
  }

  return reply;
}

export function formatLargestExpense(item: LargestExpenseResult): string {
  if (!item) {
    return "I couldn't find any recorded expenses for that period.";
  }
  return `Your largest expense in ${item.label} was ${formatRs(item.amount)} for "${item.description || item.category}" (${item.category}) on ${item.date}.`;
}

export function formatLargestExpensesList(
  items: Array<{ amount: number; category: string; description: string; date: string }>,
  range: DateRange
): string {
  if (items.length === 0) {
    return `I couldn't find any expenses recorded for ${range.label}.`;
  }
  return `Here are your largest expenses in ${range.label}:\n${items
    .map(
      (item, i) =>
        `${i + 1}. ${formatRs(item.amount)} — ${item.description || item.category} (${item.category}) on ${item.date}`
    )
    .join('\n')}`;
}

export function formatRecentTransactions(
  items: RecentTransactionItem[],
  range?: DateRange
): string {
  if (items.length === 0) {
    const periodText = range ? ` for ${range.label}` : '';
    return `I couldn't find any transactions recorded${periodText}.`;
  }

  const header = range
    ? `Here are your recent transactions for ${range.label}:`
    : 'Here are your most recent transactions:';

  return `${header}\n${items
    .map(
      (item) =>
        `• ${item.date} | ${item.type === 'EXPENSE' ? '-' : '+'}${formatRs(item.amount)} | ${item.category} — ${item.description}`
    )
    .join('\n')}`;
}

export function formatMonthlyComparison(
  a: MonthTotals,
  b: MonthTotals,
  expenseDelta: number,
  incomeDelta: number
): string {
  const expenseDirection =
    expenseDelta > 0
      ? `spent ${formatRs(expenseDelta)} more`
      : expenseDelta < 0
      ? `spent ${formatRs(Math.abs(expenseDelta))} less`
      : 'spent the same amount';

  let reply = `Comparing ${a.label} and ${b.label}: You ${expenseDirection} in ${b.label} (${formatRs(b.expense)} vs ${formatRs(a.expense)}).`;

  if (incomeDelta !== 0) {
    const incomeDirection =
      incomeDelta > 0
        ? `increased by ${formatRs(incomeDelta)}`
        : `decreased by ${formatRs(Math.abs(incomeDelta))}`;
    reply += ` Income ${incomeDirection} (${formatRs(b.income)} in ${b.label} vs ${formatRs(a.income)} in ${a.label}).`;
  }

  return reply;
}

export function formatMonthlySummary(totals: MonthTotals): string {
  if (totals.income === 0 && totals.expense === 0) {
    return `I couldn't find any transactions recorded for ${totals.label}.`;
  }

  const topCategory = totals.byCategory[0];
  const topText = topCategory
    ? ` Top category: ${topCategory.category} (${formatRs(topCategory.amount)}).`
    : '';

  return `Financial Summary for ${totals.label}:\n• Income: ${formatRs(totals.income)}\n• Expenses: ${formatRs(totals.expense)}\n• Net Savings: ${formatRs(totals.savings)} (${totals.savingsRate}% rate)${topText}`;
}

export function formatSpendingVsEarning(totals: MonthTotals): string {
  if (totals.income === 0 && totals.expense === 0) {
    return `I couldn't find any financial records for ${totals.label}.`;
  }
  const status =
    totals.savings >= 0
      ? `You earned more than you spent, saving ${formatRs(totals.savings)}.`
      : `You spent ${formatRs(Math.abs(totals.savings))} more than you earned.`;
  return `In ${totals.label}, you earned ${formatRs(totals.income)} and spent ${formatRs(totals.expense)}. ${status}`;
}

export function formatExpenseChangeWhy(
  current: MonthTotals,
  prev: MonthTotals,
  expenseDelta: number
): string {
  if (expenseDelta === 0) {
    return `Your expenses in ${current.label} (${formatRs(current.expense)}) were virtually unchanged compared to ${prev.label} (${formatRs(prev.expense)}).`;
  }

  const direction = expenseDelta > 0 ? 'increased' : 'decreased';
  let reply = `Your spending ${direction} by ${formatRs(Math.abs(expenseDelta))} in ${current.label} (${formatRs(current.expense)}) vs ${prev.label} (${formatRs(prev.expense)}).`;

  const currTop = current.byCategory[0];
  if (currTop) {
    reply += ` The main spending driver was ${currTop.category} (${formatRs(currTop.amount)}).`;
  }

  return reply;
}

export function formatSavingsChangeWhy(
  current: MonthTotals,
  prev: MonthTotals,
  savingsDelta: number
): string {
  const direction = savingsDelta >= 0 ? 'increased' : 'decreased';
  return `Your net savings ${direction} by ${formatRs(Math.abs(savingsDelta))} in ${current.label} (${formatRs(current.savings)}) compared to ${prev.label} (${formatRs(prev.savings)}).`;
}

export function formatCategoryDriver(current: MonthTotals, prev: MonthTotals): string {
  const top = current.byCategory[0];
  if (!top) {
    return `No category expenses recorded for ${current.label}.`;
  }
  return `In ${current.label}, your largest expense driver is ${top.category} at ${formatRs(top.amount)}. In ${prev.label}, total spending was ${formatRs(prev.expense)}.`;
}

export function formatUserAccountBalance(
  balanceData: { income: number; expense: number; balance: number }
): string {
  return `Your current account balance is ${formatRs(balanceData.balance)}.\n• Total Lifetime Income: ${formatRs(balanceData.income)}\n• Total Lifetime Expenses: ${formatRs(balanceData.expense)}`;
}
