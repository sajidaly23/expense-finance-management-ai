import { EXPENSE_CATEGORIES, ExpenseCategory, Expense } from '../expense/expense.model.js';
import { isDatabaseConnected } from '../../config/db.js';
import { MerchantRule } from './merchant-rule.model.js';

const KNOWN_MERCHANTS: Record<string, { category: ExpenseCategory; subcategory?: string; transactionType?: 'NEED' | 'WANT'; recurring?: boolean }> = {
  daraz: { category: 'Shopping', subcategory: 'Online Shopping', transactionType: 'WANT', recurring: false },
  foodpanda: { category: 'Food', subcategory: 'Food Delivery', transactionType: 'WANT', recurring: false },
  netflix: { category: 'Entertainment', subcategory: 'Streaming', transactionType: 'WANT', recurring: true },
  spotify: { category: 'Entertainment', subcategory: 'Music Subscription', transactionType: 'WANT', recurring: true },
  'k-electric': { category: 'Utilities', subcategory: 'Electricity', transactionType: 'NEED', recurring: true },
  kelectric: { category: 'Utilities', subcategory: 'Electricity', transactionType: 'NEED', recurring: true },
  careem: { category: 'Transport', subcategory: 'Ride Hailing', transactionType: 'NEED', recurring: false },
  uber: { category: 'Transport', subcategory: 'Ride Hailing', transactionType: 'NEED', recurring: false },
  salary: { category: 'Income' as any, subcategory: 'Monthly Salary', transactionType: 'NEED', recurring: true },
  steam: { category: 'Entertainment', subcategory: 'Gaming', transactionType: 'WANT', recurring: false },
  coursera: { category: 'Education', subcategory: 'Online Courses', transactionType: 'NEED', recurring: false },
  udemy: { category: 'Education', subcategory: 'Online Courses', transactionType: 'NEED', recurring: false },
  shell: { category: 'Transport', subcategory: 'Fuel', transactionType: 'NEED', recurring: false },
  pso: { category: 'Transport', subcategory: 'Fuel', transactionType: 'NEED', recurring: false },
};

const KEYWORD_MAP: Record<ExpenseCategory, string[]> = {
  Food: ['food', 'restaurant', 'grocery', 'groceries', 'supermarket', 'lunch', 'dinner', 'cafe', 'coffee', 'meal', 'uber eats', 'foodpanda', 'dining', 'bakery'],
  Transport: ['uber', 'careem', 'fuel', 'petrol', 'diesel', 'bus', 'train', 'taxi', 'transport', 'metro', 'gasoline', 'shell', 'pso'],
  Rent: ['rent', 'landlord', 'lease', 'housing', 'apartment'],
  Bills: ['bill', 'electric', 'electricity', 'water', 'internet', 'phone', 'mobile', 'subscription', 'netflix', 'spotify', 'consumer id', 'current bill'],
  Education: ['school', 'tuition', 'course', 'book', 'university', 'education', 'exam', 'semester', 'college', 'fee'],
  Healthcare: ['doctor', 'hospital', 'pharmacy', 'medicine', 'medical', 'health', 'clinic', 'dental', 'paracetamol', 'antibiotic', 'syrup', 'chemist'],
  Shopping: ['shop', 'mall', 'amazon', 'daraz', 'clothes', 'clothing', 'shoes', 'retail'],
  Entertainment: ['movie', 'cinema', 'game', 'concert', 'entertainment', 'hobby'],
  Travel: ['flight', 'hotel', 'travel', 'airbnb', 'vacation', 'trip'],
  Utilities: ['gas', 'utility', 'maintenance', 'repair', 'electricity', 'k-electric'],
  Other: [],
};

export function suggestCategoryFromText(description: string): {
  category: ExpenseCategory;
  subcategory?: string;
  transactionType?: 'NEED' | 'WANT';
  recurring?: boolean;
  confidence: number;
  source: 'merchant_rule' | 'keyword' | 'history' | 'default';
} {
  const text = description.toLowerCase().trim();
  if (!text) return { category: 'Other', confidence: 0.3, source: 'default' };

  for (const [key, rule] of Object.entries(KNOWN_MERCHANTS)) {
    if (text.includes(key)) {
      return {
        category: rule.category,
        subcategory: rule.subcategory,
        transactionType: rule.transactionType,
        recurring: rule.recurring,
        confidence: 0.98,
        source: 'merchant_rule',
      };
    }
  }

  let best: ExpenseCategory = 'Other';
  let bestScore = 0;

  for (const category of EXPENSE_CATEGORIES) {
    if (category === 'Other') continue;
    for (const kw of KEYWORD_MAP[category]) {
      if (text.includes(kw)) {
        const score = kw.length / text.length + 0.5;
        if (score > bestScore) {
          bestScore = score;
          best = category;
        }
      }
    }
  }

  if (bestScore > 0) {
    return { category: best, confidence: Math.min(0.95, 0.5 + bestScore * 0.2), source: 'keyword' };
  }

  return { category: 'Other', confidence: 0.35, source: 'default' };
}

export async function suggestCategory(userId: string, description: string) {
  const text = description.toLowerCase().trim();
  const keywordResult = suggestCategoryFromText(description);

  if (!isDatabaseConnected() || !text) {
    return keywordResult;
  }

  const userRule = await MerchantRule.findOne({
    userId,
    merchant: { $regex: text.slice(0, 20), $options: 'i' },
  }).lean();

  if (userRule) {
    return {
      category: userRule.category as ExpenseCategory,
      subcategory: userRule.subcategory,
      transactionType: userRule.transactionType,
      recurring: userRule.recurring,
      confidence: 0.99,
      source: 'merchant_rule' as const,
    };
  }

  const history = await Expense.find({
    userId,
    description: { $regex: text.slice(0, 20), $options: 'i' },
  })
    .sort({ date: -1 })
    .limit(5)
    .lean();

  if (history.length > 0) {
    const counts: Record<string, number> = {};
    for (const row of history) {
      counts[row.category] = (counts[row.category] || 0) + 1;
    }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= 2) {
      return {
        category: top[0] as ExpenseCategory,
        confidence: Math.min(0.95, 0.65 + top[1] * 0.08),
        source: 'history' as const,
      };
    }
  }

  return keywordResult;
}

export async function learnMerchantMapping(
  userId: string,
  merchant: string,
  category: string,
  subcategory?: string,
  transactionType?: 'NEED' | 'WANT',
  recurring?: boolean
) {
  if (!isDatabaseConnected() || !merchant.trim()) return null;
  const cleanMerchant = merchant.toLowerCase().trim();

  return MerchantRule.findOneAndUpdate(
    { userId, merchant: cleanMerchant },
    {
      category: category.trim(),
      subcategory: subcategory?.trim(),
      transactionType,
      recurring: Boolean(recurring),
    },
    { upsert: true, new: true }
  );
}

export async function findDuplicateExpenses(
  userId: string,
  amount: number,
  description: string,
  date: string
) {
  if (!isDatabaseConnected()) return [];
  const dayStart = new Date(`${date}T00:00:00.000Z`);
  const dayEnd = new Date(`${date}T23:59:59.999Z`);
  const windowStart = new Date(dayStart);
  windowStart.setUTCDate(windowStart.getUTCDate() - 3);
  const windowEnd = new Date(dayEnd);
  windowEnd.setUTCDate(windowEnd.getUTCDate() + 3);

  const matches = await Expense.find({
    userId,
    amount,
    date: { $gte: windowStart, $lte: windowEnd },
    description: { $regex: description.trim().slice(0, 30), $options: 'i' },
  })
    .limit(5)
    .lean();

  return matches.map((m) => ({
    id: String(m._id),
    amount: m.amount,
    description: m.description,
    date: m.date.toISOString().slice(0, 10),
    category: m.category,
  }));
}
