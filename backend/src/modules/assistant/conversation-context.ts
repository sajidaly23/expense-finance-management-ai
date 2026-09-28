import {
  DateRange,
  buildMonthRange,
  monthKeyFromDate,
  parsePeriod,
  shiftMonth,
  shortMonthLabel,
} from './date-parser.js';
import { matchedCategory } from './financial-query.service.js';
import type { IntentType } from './intent-parser.js';

export type ChatTurn = { role: 'user' | 'assistant'; text: string };

export type ConversationSubject =
  | 'expense'
  | 'income'
  | 'savings'
  | 'category'
  | 'comparison'
  | 'budget'
  | 'goal'
  | 'health'
  | 'forecast';

export type StructuredConversationContext = {
  lastMonthKey?: string;
  lastCategory?: string;
  lastIntent?: IntentType;
  lastSubject?: ConversationSubject;
  compareMonthKeys?: [string, string];
  lastGoalName?: string;
};

/** @deprecated Use StructuredConversationContext — kept for compatibility */
export type ConversationContext = StructuredConversationContext;

const MONTH_IN_RESPONSE =
  /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}\b/i;

function extractMonthKeyFromText(text: string, refDate: Date): string | undefined {
  const period = parsePeriod(text, refDate);
  if (period?.kind === 'single') {
    return period.range.monthKey;
  }
  const match = text.match(MONTH_IN_RESPONSE);
  if (match) {
    const parsed = parsePeriod(match[0], refDate);
    if (parsed?.kind === 'single') return parsed.range.monthKey;
  }
  return undefined;
}

function inferSubjectFromQuestion(question: string): ConversationSubject | undefined {
  const q = question.toLowerCase();
  if (matchedCategory(question)) return 'category';
  if (/\b(compare|versus|vs\.?)\b/.test(q)) return 'comparison';
  if (/\bbudget\b/.test(q)) return 'budget';
  if (/\b(goal|goals)\b/.test(q)) return 'goal';
  if (/\b(health score|financial health)\b/.test(q)) return 'health';
  if (/\b(forecast|prediction|predict)\b/.test(q)) return 'forecast';
  if (/\b(saving|saved)\b/.test(q)) return 'savings';
  if (/\b(income|salary|earn)\b/.test(q) && !/\bexpense\b/.test(q)) return 'income';
  if (/\b(expense|spent|spending|spend)\b/.test(q)) return 'expense';
  return undefined;
}

function enrichContextFromUserTurn(
  ctx: StructuredConversationContext,
  question: string,
  refDate: Date
): StructuredConversationContext {
  const next = { ...ctx };
  const q = question.toLowerCase();

  const period = parsePeriod(question, refDate, ctx.lastMonthKey);
  if (period?.kind === 'single') {
    next.lastMonthKey = period.range.monthKey;
  } else if (period?.kind === 'compare') {
    next.compareMonthKeys = [period.ranges[0].monthKey, period.ranges[1].monthKey];
    next.lastMonthKey = period.ranges[1].monthKey;
  }

  const category = matchedCategory(question);
  if (category) next.lastCategory = category;

  const subject = inferSubjectFromQuestion(question);
  if (subject) next.lastSubject = subject;

  if (/\bexpense\b/.test(q) || /\bspent\b/.test(q)) next.lastIntent = 'TOTAL_EXPENSE';
  if (category && (/\bspent\b/.test(q) || /\bhow much\b/.test(q))) next.lastIntent = 'CATEGORY_EXPENSE';
  if (/\b(income|salary)\b/.test(q)) next.lastIntent = 'TOTAL_INCOME';
  if (/\bsaving/.test(q)) next.lastIntent = 'NET_SAVINGS';
  if (/\b(top|most)\b/.test(q) && /\b(spend|expense|categor)/.test(q)) next.lastIntent = 'TOP_EXPENSE_CATEGORIES';
  if (/\bcompare\b/.test(q)) next.lastIntent = 'MONTHLY_COMPARISON';

  return next;
}

function enrichContextFromAssistant(
  ctx: StructuredConversationContext,
  assistantText: string,
  refDate: Date
): StructuredConversationContext {
  const next = { ...ctx };
  const monthKey = extractMonthKeyFromText(assistantText, refDate);
  if (monthKey) next.lastMonthKey = monthKey;

  const category = matchedCategory(assistantText);
  if (category) next.lastCategory = category;

  return next;
}

export function buildStructuredContext(history: ChatTurn[], refDate = new Date()): StructuredConversationContext {
  let ctx: StructuredConversationContext = {};

  for (let i = 0; i < history.length; i += 1) {
    const turn = history[i];
    if (turn.role === 'user') {
      ctx = enrichContextFromUserTurn(ctx, turn.text, refDate);
      const assistantTurn = history[i + 1];
      if (assistantTurn?.role === 'assistant') {
        ctx = enrichContextFromAssistant(ctx, assistantTurn.text, refDate);
      }
    } else if (turn.role === 'assistant') {
      ctx = enrichContextFromAssistant(ctx, turn.text, refDate);
    }
  }

  return ctx;
}

/** Backward-compatible alias */
export function buildContextFromHistory(history: ChatTurn[], refDate = new Date()): StructuredConversationContext {
  return buildStructuredContext(history, refDate);
}

export function isFollowUpQuestion(question: string): boolean {
  const q = question.toLowerCase().trim();
  return (
    /^(why|why\?)$/i.test(q) ||
    /\bwhy did\b/i.test(q) ||
    /^(what about|how about|and|also)\b/.test(q) ||
    /\b(that category|same category|that month|same month|that goal|that loan|the transaction)\b/.test(q) ||
    /\b(which category|what category|category caused|caused it|caused that)\b/.test(q) ||
    /\bcompare that with\b/i.test(q) ||
    /^and\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b/i.test(
      q
    ) ||
    /^(food|transport|rent|bills|education|healthcare|shopping|entertainment|travel|utilities|other)\??$/i.test(
      q
    ) ||
    /\b(last month|previous month)\b/.test(q)
  );
}

export function isShortFollowUp(question: string): boolean {
  const q = question.trim().toLowerCase();
  return /^(why|why\?|how|how\?|which one|which category|what about it|and that|that one)\??$/i.test(q);
}

export function resolvePeriod(
  question: string,
  ctx: StructuredConversationContext,
  refDate = new Date()
): DateRange {
  const period = parsePeriod(question, refDate, ctx.lastMonthKey);

  if (period?.kind === 'single') {
    return period.range;
  }

  if (isFollowUpQuestion(question) || isShortFollowUp(question)) {
    const q = question.toLowerCase().trim();

    if (/^what about (last|previous) month/i.test(q) || /^and (last|previous) month/i.test(q)) {
      const anchor = ctx.lastMonthKey || monthKeyFromDate(refDate);
      return buildMonthRange(shiftMonth(anchor, -1));
    }

    if (/^what about this month/i.test(q)) {
      return buildMonthRange(monthKeyFromDate(refDate));
    }

    const categoryOnly = matchedCategory(question);
    const monthOnly =
      /^(and\s+)?(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\??$/i.test(
        question.trim()
      );

    if (monthOnly) {
      const parsed = parsePeriod(question, refDate);
      if (parsed?.kind === 'single') return parsed.range;
    }

    if (categoryOnly && ctx.lastMonthKey) {
      return buildMonthRange(ctx.lastMonthKey);
    }

    if (ctx.lastMonthKey) {
      const monthFollowUp = question.match(
        /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b/i
      );
      if (monthFollowUp) {
        const parsed = parsePeriod(monthFollowUp[0], refDate);
        if (parsed?.kind === 'single') return parsed.range;
      }
      if (/^(what about|how about|and)\b/i.test(question.trim()) && matchedCategory(question)) {
        return buildMonthRange(ctx.lastMonthKey);
      }
      if (isShortFollowUp(question) || q === 'why' || q === 'why?') {
        return buildMonthRange(ctx.lastMonthKey);
      }
    }
  }

  return buildMonthRange(monthKeyFromDate(refDate));
}

export function resolveCategory(question: string, ctx: StructuredConversationContext): string | undefined {
  const direct = matchedCategory(question);
  if (direct) return direct;

  if ((isFollowUpQuestion(question) || isShortFollowUp(question)) && ctx.lastCategory) {
    const q = question.toLowerCase();
    if (
      /^(what about|how about|and)\b/.test(q) ||
      q.includes('that category') ||
      q.includes('same category') ||
      /\b(which category|category caused|caused it)\b/.test(q) ||
      isShortFollowUp(question)
    ) {
      return ctx.lastCategory;
    }
  }

  return undefined;
}

export function formatPeriodShort(monthKey: string) {
  return `${shortMonthLabel(monthKey)} ${monthKey.slice(0, 4)}`;
}

export function resolveComparisonMonths(
  question: string,
  ctx: StructuredConversationContext,
  refDate: Date
): [string, string] | null {
  if (!/\bcompare (that|it) with\b/i.test(question) && !/\bcompare with\b/i.test(question)) {
    return null;
  }

  const parsed = parsePeriod(question, refDate);
  if (parsed?.kind === 'compare') {
    return [parsed.ranges[0].monthKey, parsed.ranges[1].monthKey];
  }

  if (parsed?.kind === 'single' && ctx.lastMonthKey) {
    return [ctx.lastMonthKey, parsed.range.monthKey];
  }

  if (ctx.compareMonthKeys) {
    return ctx.compareMonthKeys;
  }

  return null;
}
