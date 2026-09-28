/** Shared UTC / dynamic period date helpers aligned with real database queries */

export type DateRange = {
  start: Date;
  end: Date;
  monthKey: string;
  label: string;
  isExplicitRange?: boolean;
  periodType?: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
};

export type ParsedPeriod =
  | { kind: 'single'; range: DateRange }
  | { kind: 'compare'; ranges: [DateRange, DateRange] };

export const MONTH_NAMES: Record<string, number> = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sep: 8,
  sept: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11,
};

export const MONTH_FULL_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function monthKeyFromDate(value: Date): string {
  return value.toISOString().slice(0, 7);
}

export function shiftMonth(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(monthKey: string): string {
  const date = new Date(`${monthKey}-01T00:00:00.000Z`);
  const month = date.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
  const year = date.getUTCFullYear();
  return `${month} ${year}`;
}

export function shortMonthLabel(monthKey: string): string {
  const date = new Date(`${monthKey}-01T00:00:00.000Z`);
  return date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
}

export function startOfMonth(monthKey: string): Date {
  return new Date(`${monthKey}-01T00:00:00.000Z`);
}

export function startOfNextMonth(monthKey: string): Date {
  return startOfMonth(shiftMonth(monthKey, 1));
}

export function inferYearForMonth(monthIndex: number, refDate: Date): number {
  const refMonth = refDate.getUTCMonth();
  const refYear = refDate.getUTCFullYear();
  if (monthIndex > refMonth) {
    return refYear - 1;
  }
  return refYear;
}

export function buildMonthKey(monthIndex: number, year: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

export function buildMonthRange(monthKey: string): DateRange {
  return {
    start: startOfMonth(monthKey),
    end: startOfNextMonth(monthKey),
    monthKey,
    label: monthLabel(monthKey),
    periodType: 'month',
  };
}

/**
 * Checks if "may" in the text is the English modal verb (or a typo for "many")
 * rather than the month of May.
 */
function isModalVerbMay(text: string): boolean {
  const q = text.toLowerCase();
  if (!/\bmay\b/.test(q)) return false;

  // Typo for "how many" (e.g. "how may expenses")
  if (/\bhow\s+may\b/.test(q)) return true;

  // Modal verb constructs: "may I", "you may", "it may", "may be", "may have", "may need", "may ask"
  if (/\b(i|you|he|she|we|they|it|there)\s+may\b/.test(q)) return true;
  if (/\bmay\s+(i|we|you|they|he|she|it|be|have|not|get|see|show|find|know|ask|help)\b/.test(q)) return true;

  // If preceded by clear date prepositions, it IS the month of May
  if (/\b(in|during|for|of|since|until|by|from|to|between)\s+may\b/.test(q)) return false;

  // If accompanied by year or day number: "may 2026", "may 1st", "15 may"
  if (/\bmay\s+\d{1,4}\b/.test(q) || /\b\d{1,2}(st|nd|rd|th)?\s+(of\s+)?may\b/.test(q)) return false;

  // If followed directly by financial keywords: "may expenses", "may income", "may budget", "may transactions"
  if (/\bmay\s+(expenses?|spending|income|budget|transactions?|salary|savings?)\b/.test(q)) return false;

  // Default: ambiguous standalone "may" in sentences like "what may I..." or typos is NOT the month of May
  return true;
}

/**
 * Parse relative periods like:
 * today, yesterday, this week, last week, this month, last month, this year, last year, last 30 days, last 3 months
 */
function parseRelativePeriod(text: string, refDate: Date): DateRange | null {
  const q = text.toLowerCase();
  const currentMonthKey = monthKeyFromDate(refDate);

  // 1. Today
  if (/\btoday\b/.test(q)) {
    const start = new Date(refDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    const dateStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
    return {
      start,
      end,
      monthKey: currentMonthKey,
      label: `Today (${dateStr})`,
      periodType: 'day',
    };
  }

  // 2. Yesterday
  if (/\byesterday\b/.test(q)) {
    const start = new Date(refDate);
    start.setUTCDate(start.getUTCDate() - 1);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    const dateStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
    return {
      start,
      end,
      monthKey: monthKeyFromDate(start),
      label: `Yesterday (${dateStr})`,
      periodType: 'day',
    };
  }

  // 3. This Week
  if (/\b(this week|current week)\b/.test(q)) {
    const dayOfWeek = refDate.getUTCDay(); // 0 is Sunday, 1 is Monday
    const distanceToMonday = (dayOfWeek + 6) % 7;
    const start = new Date(refDate);
    start.setUTCDate(start.getUTCDate() - distanceToMonday);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(refDate); // up to now or end of week
    end.setUTCHours(23, 59, 59, 999);
    const label = `This Week (${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} - ${refDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })})`;
    return {
      start,
      end,
      monthKey: currentMonthKey,
      label,
      periodType: 'week',
    };
  }

  // 4. Last Week / Previous Week
  if (/\b(last week|previous week|past week)\b/.test(q)) {
    const dayOfWeek = refDate.getUTCDay();
    const distanceToMonday = (dayOfWeek + 6) % 7;
    const end = new Date(refDate);
    end.setUTCDate(end.getUTCDate() - distanceToMonday);
    end.setUTCHours(0, 0, 0, 0); // Monday 00:00 of this week
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 7); // Monday 00:00 of last week
    const lastSun = new Date(end);
    lastSun.setUTCDate(lastSun.getUTCDate() - 1);
    const label = `Last Week (${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} - ${lastSun.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })})`;
    return {
      start,
      end,
      monthKey: monthKeyFromDate(start),
      label,
      periodType: 'week',
    };
  }

  // 5. This Month
  if (/\b(this month|current month)\b/.test(q)) {
    return buildMonthRange(currentMonthKey);
  }

  // 6. Last Month / Previous Month
  if (/\b(last month|previous month|past month)\b/.test(q)) {
    return buildMonthRange(shiftMonth(currentMonthKey, -1));
  }

  // 7. This Year / Current Year
  if (/\b(this year|current year)\b/.test(q)) {
    const year = refDate.getUTCFullYear();
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1));
    return {
      start,
      end,
      monthKey: `${year}-01`,
      label: `Year ${year}`,
      periodType: 'year',
    };
  }

  // 8. Last Year / Previous Year
  if (/\b(last year|previous year|past year)\b/.test(q)) {
    const year = refDate.getUTCFullYear() - 1;
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1));
    return {
      start,
      end,
      monthKey: `${year}-01`,
      label: `Year ${year}`,
      periodType: 'year',
    };
  }

  // 9. Last 30 Days
  if (/\b(last 30 days|past 30 days)\b/.test(q)) {
    const start = new Date(refDate);
    start.setUTCDate(start.getUTCDate() - 30);
    return {
      start,
      end: refDate,
      monthKey: currentMonthKey,
      label: 'Last 30 Days',
      periodType: 'custom',
    };
  }

  // 10. Last 3 Months / Previous 3 Months / Last 90 Days
  if (/\b(last 3 months|previous 3 months|past 3 months|last 90 days)\b/.test(q)) {
    const startKey = shiftMonth(currentMonthKey, -2);
    const start = startOfMonth(startKey);
    const end = startOfNextMonth(currentMonthKey);
    return {
      start,
      end,
      monthKey: startKey,
      label: `${monthLabel(startKey)} - ${monthLabel(currentMonthKey)}`,
      periodType: 'custom',
    };
  }

  // 11. Last 6 Months
  if (/\b(last 6 months|past 6 months)\b/.test(q)) {
    const startKey = shiftMonth(currentMonthKey, -5);
    const start = startOfMonth(startKey);
    const end = startOfNextMonth(currentMonthKey);
    return {
      start,
      end,
      monthKey: startKey,
      label: `${monthLabel(startKey)} - ${monthLabel(currentMonthKey)}`,
      periodType: 'custom',
    };
  }

  return null;
}

/**
 * Parses ranges like "from January to March", "between June and August", "June to August"
 */
function parseMultiMonthRange(text: string, refDate: Date): DateRange | null {
  const q = text.toLowerCase();

  const pattern =
    /\b(?:from|between)?\s*(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)\s*(?:to|and|-|through)\s*(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)(?:\s+(\d{4}))?\b/;

  const match = q.match(pattern);
  if (!match) return null;

  const startName = match[1];
  const endName = match[2];
  const explicitYear = match[3] ? Number(match[3]) : null;

  const startIndex = MONTH_NAMES[startName];
  const endIndex = MONTH_NAMES[endName];

  if (startIndex === undefined || endIndex === undefined) return null;

  const year = explicitYear ?? inferYearForMonth(endIndex, refDate);
  const startKey = buildMonthKey(startIndex, year);
  const endKey = buildMonthKey(endIndex, year);

  const start = startOfMonth(startKey);
  const end = startOfNextMonth(endKey);

  return {
    start,
    end,
    monthKey: startKey,
    label: `${MONTH_FULL_NAMES[startIndex]} - ${MONTH_FULL_NAMES[endIndex]} ${year}`,
    isExplicitRange: true,
    periodType: 'custom',
  };
}

function parseExplicitMonthYear(text: string, refDate: Date): string | null {
  const q = text.toLowerCase();

  // 1. "August 2026", "aug 2026"
  const namedYear = q.match(
    /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)\s+(\d{4})\b/
  );
  if (namedYear) {
    const monthIndex = MONTH_NAMES[namedYear[1]];
    return buildMonthKey(monthIndex, Number(namedYear[2]));
  }

  // 2. Year alone: "in 2025", "for 2026"
  const yearAlone = q.match(/\b(?:in|for|during)\s+(20\d\d)\b/);
  if (yearAlone) {
    return `${yearAlone[1]}-01`;
  }

  // 3. Standalone month name (carefully filtering out "may" modal verb)
  const monthPattern =
    /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)\b/g;

  const matches = [...q.matchAll(monthPattern)];
  for (const m of matches) {
    const name = m[1];
    if (name === 'may' && isModalVerbMay(text)) {
      continue; // Skip modal verb "may"
    }
    const monthIndex = MONTH_NAMES[name];
    if (monthIndex !== undefined) {
      const year = inferYearForMonth(monthIndex, refDate);
      return buildMonthKey(monthIndex, year);
    }
  }

  // 4. YYYY-MM
  const iso = q.match(/\b(\d{4})-(\d{2})\b/);
  if (iso) {
    const month = Number(iso[2]);
    if (month >= 1 && month <= 12) {
      return `${iso[1]}-${iso[2]}`;
    }
  }

  return null;
}

function parseQuarter(text: string, refDate: Date): DateRange | null {
  const q = text.toLowerCase();
  const quarterMatch = q.match(/\bq([1-4])\b(?:\s+(\d{4}))?/);
  if (!quarterMatch) return null;

  const quarter = Number(quarterMatch[1]);
  const year = quarterMatch[2] ? Number(quarterMatch[2]) : refDate.getUTCFullYear();
  const startMonth = (quarter - 1) * 3;
  const startKey = buildMonthKey(startMonth, year);
  const endKey = buildMonthKey(startMonth + 2, year);

  return {
    start: startOfMonth(startKey),
    end: startOfNextMonth(endKey),
    monthKey: startKey,
    label: `Q${quarter} ${year}`,
    periodType: 'quarter',
  };
}

function extractComparisonMonths(text: string, refDate: Date): [string, string] | null {
  const q = text.toLowerCase();
  const hasCompareKeyword =
    /\b(compare|comparison|versus|vs\.?|against|difference between|more this month than last month|increase(d)? this month|higher this month|lower this month|spent more)\b/.test(
      q
    );

  if (!hasCompareKeyword) {
    return null;
  }

  const currentKey = monthKeyFromDate(refDate);
  const prevKey = shiftMonth(currentKey, -1);

  // Compare this month with last month phrases
  if (
    /\bthis month\b/.test(q) &&
    (/\blast month\b/.test(q) || /\bprevious month\b/.test(q))
  ) {
    return [prevKey, currentKey];
  }

  if (/\b(increase|higher|more|lower|decrease)\b/.test(q) && /\bthis month\b/.test(q)) {
    return [prevKey, currentKey];
  }

  // Named months comparison: "compare July and August"
  const found: string[] = [];
  for (const [name, index] of Object.entries(MONTH_NAMES)) {
    if (name.length <= 3 && name !== 'may') continue;
    if (name === 'may' && isModalVerbMay(text)) continue;

    const regex = new RegExp(`\\b${name}\\b`, 'i');
    if (regex.test(q)) {
      const key = buildMonthKey(index, inferYearForMonth(index, refDate));
      if (!found.includes(key)) found.push(key);
    }
  }

  if (found.length >= 2) {
    return [found[0], found[1]];
  }

  return null;
}

export function parsePeriod(
  question: string,
  refDate = new Date(),
  contextMonthKey?: string
): ParsedPeriod | null {
  // 1. Comparison questions first
  const comparison = extractComparisonMonths(question, refDate);
  if (comparison) {
    return {
      kind: 'compare',
      ranges: [buildMonthRange(comparison[0]), buildMonthRange(comparison[1])],
    };
  }

  // 2. Relative dates (last month, this week, yesterday, etc.) MUST take precedence over standalone words!
  const relative = parseRelativePeriod(question, refDate);
  if (relative) {
    return { kind: 'single', range: relative };
  }

  // 3. Multi-month ranges ("from Jan to March")
  const multiMonth = parseMultiMonthRange(question, refDate);
  if (multiMonth) {
    return { kind: 'single', range: multiMonth };
  }

  // 4. Quarters
  const quarter = parseQuarter(question, refDate);
  if (quarter) {
    return { kind: 'single', range: quarter };
  }

  // 5. Explicit month or year
  const explicit = parseExplicitMonthYear(question, refDate);
  if (explicit) {
    return { kind: 'single', range: buildMonthRange(explicit) };
  }

  // 6. Conversational reference ("that month", "same period")
  if (contextMonthKey && /\b(that month|same month|that period)\b/i.test(question)) {
    return { kind: 'single', range: buildMonthRange(contextMonthKey) };
  }

  return null;
}

export function defaultCurrentPeriod(refDate = new Date()): DateRange {
  const monthKey = monthKeyFromDate(refDate);
  return buildMonthRange(monthKey);
}
