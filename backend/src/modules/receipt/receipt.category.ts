import { EXPENSE_CATEGORIES, ExpenseCategory } from '../expense/expense.model.js';
import { suggestCategoryFromText } from '../categorize/categorize.service.js';
import { ReceiptLineItem } from './receipt.types.js';

const CATEGORY_ALIASES: Record<string, ExpenseCategory> = {
  medical: 'Healthcare',
  medicine: 'Healthcare',
  pharmacy: 'Healthcare',
  health: 'Healthcare',
  hospital: 'Healthcare',
  clinic: 'Healthcare',
  groceries: 'Food',
  grocery: 'Food',
  restaurant: 'Food',
  cafe: 'Food',
  fuel: 'Transport',
  petrol: 'Transport',
  gasoline: 'Transport',
  utilities: 'Utilities',
  utility: 'Utilities',
  electricity: 'Utilities',
  internet: 'Bills',
  mobile: 'Bills',
  phone: 'Bills',
  tuition: 'Education',
  university: 'Education',
  school: 'Education',
  hotel: 'Travel',
  flight: 'Travel',
  cinema: 'Entertainment',
  movie: 'Entertainment',
  clothing: 'Shopping',
  apparel: 'Shopping',
};

const RECEIPT_KEYWORDS: Record<ExpenseCategory, string[]> = {
  Healthcare: [
    'pharmacy',
    'medicine',
    'medical',
    'hospital',
    'clinic',
    'doctor',
    'paracetamol',
    'antibiotic',
    'syrup',
    'tablet',
    'capsule',
    'chemist',
    'dispensary',
  ],
  Education: ['university', 'school', 'tuition', 'semester', 'fee', 'exam', 'course', 'college', 'admission'],
  Utilities: ['electricity', 'electric', 'k-electric', 'kelectric', 'utility', 'gas bill', 'water bill', 'sui gas'],
  Bills: ['internet', 'mobile', 'phone', 'subscription', 'bill payment', 'consumer id', 'current bill'],
  Food: ['restaurant', 'cafe', 'coffee', 'food', 'meal', 'pizza', 'burger', 'biryani', 'bakery', 'grocery', 'supermarket'],
  Transport: ['fuel', 'petrol', 'diesel', 'shell', 'pso', 'total parco', 'careem', 'uber', 'taxi'],
  Shopping: ['mall', 'store', 'shop', 'clothing', 'garments', 'shoes', 'daraz', 'retail'],
  Entertainment: ['cinema', 'movie', 'game', 'entertainment', 'ticket'],
  Travel: ['hotel', 'airline', 'flight', 'travel', 'airbnb'],
  Rent: ['rent', 'landlord', 'lease'],
  Other: [],
};

function normalizeCategory(raw: string | null): ExpenseCategory | null {
  if (!raw) return null;
  const cleaned = raw.trim();
  if (!cleaned) return null;

  const direct = EXPENSE_CATEGORIES.find((category) => category.toLowerCase() === cleaned.toLowerCase());
  if (direct) return direct;

  const alias = CATEGORY_ALIASES[cleaned.toLowerCase()];
  if (alias) return alias;

  return null;
}

function scoreCategory(text: string, category: ExpenseCategory) {
  let score = 0;
  for (const keyword of RECEIPT_KEYWORDS[category]) {
    if (text.includes(keyword)) {
      score += keyword.length >= 6 ? 2 : 1;
    }
  }
  return score;
}

export function inferReceiptCategory(input: {
  merchant: string | null;
  lineItems: ReceiptLineItem[];
  ocrText: string;
  aiCategory: string | null;
}): { category: ExpenseCategory | null; confidence: number; reason: string } {
  const parts = [
    input.merchant || '',
    input.aiCategory || '',
    input.ocrText,
    ...input.lineItems.map((item) => item.name),
  ];
  const corpus = parts.join('\n').toLowerCase().trim();

  if (!corpus) {
    return { category: null, confidence: 0, reason: 'No merchant or line-item text available for category inference.' };
  }

  const normalizedAi = normalizeCategory(input.aiCategory);
  if (normalizedAi && normalizedAi !== 'Other') {
    return {
      category: normalizedAi,
      confidence: 0.82,
      reason: `Vision model suggested ${normalizedAi} from receipt content.`,
    };
  }

  let best: ExpenseCategory | null = null;
  let bestScore = 0;
  for (const category of EXPENSE_CATEGORIES) {
    if (category === 'Other') continue;
    const score = scoreCategory(corpus, category);
    if (score > bestScore) {
      bestScore = score;
      best = category;
    }
  }

  if (best && bestScore >= 2) {
    return {
      category: best,
      confidence: Math.min(0.95, 0.55 + bestScore * 0.08),
      reason: `Matched receipt keywords for ${best}.`,
    };
  }

  const keywordResult = suggestCategoryFromText(corpus);
  if (keywordResult.category !== 'Other') {
    return {
      category: keywordResult.category,
      confidence: keywordResult.confidence,
      reason: `Matched merchant/keyword rules for ${keywordResult.category}.`,
    };
  }

  if (best && bestScore > 0) {
    return {
      category: best,
      confidence: 0.45,
      reason: `Weak keyword match for ${best}; please confirm category.`,
    };
  }

  return {
    category: 'Other',
    confidence: 0.25,
    reason: 'Insufficient evidence on the receipt to infer a specific category.',
  };
}
