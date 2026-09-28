import {
  ParsedPeriod,
  buildMonthRange,
  monthKeyFromDate,
  parsePeriod,
  shiftMonth,
} from './date-parser.js';
import { WhatIfScenario, parseWhatIfScenario } from './affordability.service.js';
import { detectEducationTopic } from './financial-education.service.js';
import { matchedCategory } from './financial-query.service.js';
import {
  ConversationContext,
  isFollowUpQuestion,
  isShortFollowUp,
} from './conversation-context.js';

export type IntentType =
  | 'GREETING'
  | 'HELP'
  | 'TOTAL_INCOME'
  | 'TOTAL_EXPENSE'
  | 'NET_SAVINGS'
  | 'CATEGORY_EXPENSE'
  | 'SALARY_INCOME'
  | 'SALARY_TRANSACTION_COUNT'
  | 'TOP_EXPENSE_CATEGORIES'
  | 'LARGEST_EXPENSE'
  | 'LARGEST_EXPENSES_LIST'
  | 'RECENT_TRANSACTIONS'
  | 'ACCOUNT_BALANCE'
  | 'MONTHLY_COMPARISON'
  | 'MONTHLY_SUMMARY'
  | 'BUDGET_STATUS'
  | 'SAVINGS_GOAL_STATUS'
  | 'FORECAST'
  | 'FINANCIAL_HEALTH'
  | 'NEED_VS_WANT'
  | 'SPENDING_VS_EARNING'
  | 'COMPOSITE'
  | 'CLARIFICATION'
  | 'FINANCIAL_EDUCATION'
  | 'EXPENSE_CHANGE_WHY'
  | 'SAVINGS_CHANGE_WHY'
  | 'CATEGORY_DRIVER'
  | 'WHAT_IF'
  | 'GENERAL';

export type Intent =
  | {
      type: Exclude<
        IntentType,
        | 'COMPOSITE'
        | 'CATEGORY_EXPENSE'
        | 'MONTHLY_COMPARISON'
        | 'FINANCIAL_EDUCATION'
        | 'WHAT_IF'
      >;
      period?: ParsedPeriod;
    }
  | { type: 'CATEGORY_EXPENSE'; category: string; period?: ParsedPeriod }
  | { type: 'MONTHLY_COMPARISON'; period: ParsedPeriod & { kind: 'compare' } }
  | { type: 'FINANCIAL_EDUCATION'; topic: string }
  | { type: 'WHAT_IF'; scenario: WhatIfScenario }
  | { type: 'COMPOSITE'; intents: Intent[] };

function normalize(q: string): string {
  return q.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function isGreetingOnly(question: string): boolean {
  const q = question.trim().toLowerCase();
  return /^(hi|hello|hey|yo|salam|assalamu alaikum|good morning|good afternoon|good evening|thanks|thank you|ok|okay|bye)[\s!.,?]*$/i.test(
    q
  );
}

function asksSalaryCount(q: string): boolean {
  return (
    (/\bhow many\b/.test(q) && /\bsalary\b/.test(q)) ||
    (/\bnumber of\b/.test(q) && /\bsalary\b/.test(q)) ||
    (/\bcount\b/.test(q) && /\bsalary\b/.test(q))
  );
}

function asksSalaryAmount(q: string): boolean {
  return (
    (/\bhow much\b/.test(q) && /\bsalary\b/.test(q)) ||
    (/\bsalary\b/.test(q) && /\b(received|receive|earn|earned|income|got|paid)\b/.test(q)) ||
    (/\bsalary\b/.test(q) &&
      !asksSalaryCount(q) &&
      !/\bexpense\b/.test(q) &&
      /\b(how much|total|amount)\b/.test(q))
  );
}

function asksIncome(q: string): boolean {
  return (
    /\b(income|earned|earning|earn|earnings|revenue|received|receive)\b/.test(q) &&
    !asksSalaryCount(q)
  );
}

function asksExpense(q: string): boolean {
  return /\b(expense|expenses|spent|spending|spend|cost|costs|paid|outflow)\b/.test(q);
}

function asksSavings(q: string): boolean {
  return /\b(sav(e|ed|ings)|saved)\b/.test(q);
}

function asksTopCategories(q: string): boolean {
  return (
    (/\b(top|highest|biggest|most)\b/.test(q) &&
      (/\bcategor/.test(q) || /\bspend/.test(q) || /\bexpense/.test(q))) ||
    /\b(which category|what category)\b.*\b(spend|spent|most|highest)\b/.test(q)
  );
}

function asksLargestExpense(q: string): boolean {
  return (
    /\b(largest|biggest|highest|maximum)\b/.test(q) &&
    /\b(expense|expenses|transaction|purchase|spending)\b/.test(q) &&
    !/\bcategor/.test(q)
  );
}

function asksLargestExpensesList(q: string): boolean {
  return (
    (/\b(show|list|tell me|give me|what are)\b/.test(q) &&
      /\b(biggest|largest|top|highest)\b/.test(q) &&
      /\bexpenses\b/.test(q)) ||
    /\b(my biggest expenses|my largest expenses|top expenses)\b/.test(q)
  );
}

function asksRecentTransactions(q: string): boolean {
  return (
    /\b(recent transactions|recent expenses|latest transactions|latest expenses|show my transactions|recent purchases)\b/.test(
      q
    ) ||
    (/\b(show|list|display)\b/.test(q) &&
      /\b(transactions|expenses)\b/.test(q) &&
      !/\b(compare|summary)\b/.test(q)) ||
    /\b(what did i spend yesterday|what did i spend last week)\b/.test(q)
  );
}

function asksAccountBalance(q: string): boolean {
  return (
    /\b(account balance|net balance|current balance|total balance|my balance|how much money do i have|how much in my account|bank balance)\b/.test(
      q
    )
  );
}

function asksSpendMost(q: string): boolean {
  return (
    /\b(spend the most|spent the most|where did i spend|most spending|where did my money go)\b/.test(
      q
    ) ||
    /\b(where|how).*\bmoney\b.*\b(most|mostly)\b/.test(q) ||
    /\b(money used|used mostly|used most)\b/.test(q)
  );
}

function asksBudget(q: string): boolean {
  return (
    /\b(budget|budgets|exceed|over budget|remaining budget|left in budget|budget status|budget limit)\b/.test(
      q
    )
  );
}

function asksGoals(q: string): boolean {
  return /\b(goal|goals|savings goal|target)\b/.test(q);
}

function asksForecast(q: string): boolean {
  return (
    /\b(forecast|prediction|predict|expected to spend|upcoming month|predicted)\b/.test(q) &&
    (/\b(expense|spend|spending|budget|money)\b/.test(q) || /\bnext month\b/.test(q))
  );
}

function asksHealth(q: string): boolean {
  return /\b(health|health score|financial health|health status|score)\b/.test(q);
}

function asksNeedVsWant(q: string): boolean {
  return /\b(need|want)s?\b/.test(q) && /\b(vs|versus|against|split|share|percent)\b/.test(q);
}

function asksSpendingVsEarning(q: string): boolean {
  return asksIncome(q) && asksExpense(q) && !matchedCategory(q) && !asksSalaryCount(q);
}

function asksMonthlySummary(q: string): boolean {
  return (
    /\b(monthly financial summary|financial summary|monthly summary|summarize my finances|overview|breakdown)\b/.test(
      q
    ) ||
    (asksIncome(q) && asksExpense(q) && asksSavings(q))
  );
}

function asksComparison(q: string, refDate: Date): ParsedPeriod | null {
  const period = parsePeriod(q, refDate);
  if (period?.kind === 'compare') return period;

  const norm = normalize(q);
  if (
    /\b(compare|versus|vs\.?|more this month than last month|increase(d)? this month|higher this month|lower this month|spent more)\b/.test(
      norm
    )
  ) {
    const currentKey = monthKeyFromDate(refDate);
    const prevKey = shiftMonth(currentKey, -1);
    return {
      kind: 'compare',
      ranges: [buildMonthRange(prevKey), buildMonthRange(currentKey)],
    };
  }

  return null;
}

function detectSingleIntent(q: string, refDate: Date, ctx: ConversationContext): Intent | null {
  const category = matchedCategory(q);
  const period = parsePeriod(q, refDate, ctx.lastMonthKey) || undefined;

  // 1. Account balance
  if (asksAccountBalance(q)) {
    return { type: 'ACCOUNT_BALANCE', period };
  }

  // 2. Recent transactions
  if (asksRecentTransactions(q)) {
    return { type: 'RECENT_TRANSACTIONS', period };
  }

  // 3. Largest expenses (list or single)
  if (asksLargestExpensesList(q)) {
    return { type: 'LARGEST_EXPENSES_LIST', period };
  }
  if (asksLargestExpense(q)) {
    return { type: 'LARGEST_EXPENSE', period };
  }

  // 4. Salary
  if (asksSalaryCount(q)) {
    return { type: 'SALARY_TRANSACTION_COUNT', period };
  }
  if (asksSalaryAmount(q)) {
    return { type: 'SALARY_INCOME', period };
  }

  // 5. Top categories / Spend most
  if (asksSpendMost(q) || asksTopCategories(q)) {
    return { type: 'TOP_EXPENSE_CATEGORIES', period };
  }

  // 6. Category expense (e.g. food, transport, bills, rent, etc.)
  if (
    category &&
    (asksExpense(q) ||
      /\b(how much|what did|what was|tell me|show)\b/.test(q) ||
      isFollowUpQuestion(q) ||
      /\bhow may expenses\b/.test(q))
  ) {
    return { type: 'CATEGORY_EXPENSE', category, period };
  }

  // 7. Needs vs Wants
  if (asksNeedVsWant(q)) {
    return { type: 'NEED_VS_WANT', period };
  }

  // 8. Savings
  if (asksSavings(q) && !asksForecast(q) && !asksGoals(q)) {
    return { type: 'NET_SAVINGS', period };
  }

  // 9. Summary
  if (asksMonthlySummary(q)) {
    return { type: 'MONTHLY_SUMMARY', period };
  }

  // 10. Income
  if (asksIncome(q) && !asksExpense(q)) {
    return { type: 'TOTAL_INCOME', period };
  }

  // 11. Expense
  if (asksExpense(q) && !asksIncome(q)) {
    return { type: 'TOTAL_EXPENSE', period };
  }

  // 12. "Give me / Tell me / Show my" phrases
  if (/\b(give me|tell me|what were|show me)\b/.test(q) && /\bexpense/.test(q)) {
    return { type: 'TOTAL_EXPENSE', period };
  }
  if (/\b(give me|tell me|what was|show me)\b/.test(q) && /\bincome\b/.test(q)) {
    return { type: 'TOTAL_INCOME', period };
  }

  // 13. Spending vs Earning
  if (asksSpendingVsEarning(q)) {
    return { type: 'SPENDING_VS_EARNING', period };
  }

  // 14. Budgets
  if (asksBudget(q)) {
    return { type: 'BUDGET_STATUS', period };
  }

  // 15. Goals
  if (asksGoals(q)) {
    return { type: 'SAVINGS_GOAL_STATUS' };
  }

  // 16. Forecast / Prediction
  if (asksForecast(q)) {
    return { type: 'FORECAST' };
  }

  // 17. Health Score
  if (asksHealth(q)) {
    return { type: 'FINANCIAL_HEALTH' };
  }

  // 18. Standalone category mention in a financial context
  if (category) {
    return { type: 'CATEGORY_EXPENSE', category, period };
  }

  return null;
}

function detectFollowUpIntent(
  question: string,
  ctx: ConversationContext,
  refDate: Date
): Intent | null {
  const q = normalize(question);
  const trimmed = question.trim();

  if (!isFollowUpQuestion(question) && !isShortFollowUp(question)) {
    return null;
  }

  if (/^why\??$/i.test(trimmed) || /\bwhy did (my )?(spending|expenses|it)\b/.test(q)) {
    if (ctx.lastSubject === 'savings' || ctx.lastIntent === 'NET_SAVINGS') {
      const monthKey = ctx.lastMonthKey || monthKeyFromDate(refDate);
      return {
        type: 'SAVINGS_CHANGE_WHY',
        period: { kind: 'single', range: buildMonthRange(monthKey) },
      };
    }
    const monthKey = ctx.lastMonthKey || monthKeyFromDate(refDate);
    return {
      type: 'EXPENSE_CHANGE_WHY',
      period: { kind: 'single', range: buildMonthRange(monthKey) },
    };
  }

  if (/\bwhat drove\b/.test(q) || /\bwhich category\b/.test(q)) {
    const monthKey = ctx.lastMonthKey || monthKeyFromDate(refDate);
    return {
      type: 'CATEGORY_DRIVER',
      period: { kind: 'single', range: buildMonthRange(monthKey) },
    };
  }

  const followUpPeriod = parsePeriod(q, refDate, ctx.lastMonthKey);
  const isPeriodFollowUp = /^(what about|how about|and)\b/i.test(q) || /^\s*(last month|this month|previous month)\??\s*$/i.test(q);
  const hasExplicitIntent = /\b(total|expense|income|spend|spending|save|saving|balance|how many|how much)\b/i.test(q);

  if (followUpPeriod && ctx.lastCategory && isPeriodFollowUp && !hasExplicitIntent) {
    return {
      type: 'CATEGORY_EXPENSE',
      category: ctx.lastCategory,
      period: followUpPeriod,
    };
  }

  const cat = matchedCategory(q);
  if (cat) {
    const monthKey = ctx.lastMonthKey || monthKeyFromDate(refDate);
    return {
      type: 'CATEGORY_EXPENSE',
      category: cat,
      period: { kind: 'single', range: buildMonthRange(monthKey) },
    };
  }

  return null;
}

export function parseIntents(
  question: string,
  ctx: ConversationContext = {},
  refDate = new Date()
): Intent {
  const q = normalize(question);

  // 1. Pure greeting
  if (isGreetingOnly(question)) {
    return { type: 'GREETING' };
  }

  // 2. Help inquiry
  if (/^(help|\?|what can you do|how do i use this)\??$/i.test(question.trim())) {
    return { type: 'HELP' };
  }

  // 3. Financial Education concepts ("what is an emergency fund", etc.)
  const educationTopic = detectEducationTopic(question);
  if (educationTopic) {
    return { type: 'FINANCIAL_EDUCATION', topic: educationTopic };
  }

  // 4. Affordability / What-If scenarios
  const scenario = parseWhatIfScenario(question);
  if (scenario) {
    return { type: 'WHAT_IF', scenario };
  }

  // 5. Follow-up intent
  const followUp = detectFollowUpIntent(question, ctx, refDate);
  if (followUp) {
    return followUp;
  }

  // 6. Explicit comparisons ("compare July and August", "did spending increase this month")
  const comparison = asksComparison(q, refDate);
  if (comparison && comparison.kind === 'compare') {
    return { type: 'MONTHLY_COMPARISON', period: comparison };
  }

  // 7. Composite question handling: "give me August expense and how many salary"
  if (/\band\b/i.test(question)) {
    const segments = question
      .split(/\band\b/i)
      .map((seg) => seg.trim())
      .filter(Boolean);

    if (segments.length >= 2) {
      const parsedSubs: Intent[] = [];
      for (const seg of segments) {
        const sub = detectSingleIntent(normalize(seg), refDate, ctx);
        if (sub) parsedSubs.push(sub);
      }
      if (parsedSubs.length >= 2) {
        return { type: 'COMPOSITE', intents: parsedSubs };
      }
    }
  }

  // 8. Single intent detection
  const detected = detectSingleIntent(q, refDate, ctx);
  if (detected) {
    return detected;
  }

  // 9. Fallback general intent
  return { type: 'GENERAL' };
}
