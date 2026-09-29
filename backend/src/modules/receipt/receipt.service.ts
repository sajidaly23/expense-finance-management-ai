import { AppError } from '../../utils/AppError.js';
import { config } from '../../config/env.js';
import { inferReceiptCategory } from './receipt.category.js';
import {
  buildReceiptWarnings,
  extractTotalFromOcrText,
  overallConfidence,
  parseMoney,
  parseReceiptDate,
  parseReceiptTime,
  sanitizeLineItems,
  unwrapVisionField,
  validateImageInput,
} from './receipt.validation.js';
import { parseReceiptFromText, recognizeTextWithTesseract } from './receipt.ocr.js';
import { ExpenseCategory } from '../expense/expense.model.js';
import { ExtractedField, ReceiptScanResult, VisionReceiptPayload } from './receipt.types.js';

const VISION_SYSTEM_PROMPT = `You are a receipt, fee voucher, utility bill, and invoice OCR extraction engine for SmartFin.
Analyze ONLY the uploaded document image. Extract what is actually visible.

Rules:
- Never invent merchant names, amounts, dates, tax, payment methods, or line items.
- If a field is missing or unreadable, return null for its value and a low confidence.
- For Fee Vouchers / University Receipts (e.g. Karakoram International University, NUST, FAST, COMSATS, Punjab Uni, HBL Fee Voucher):
  - merchantName should be the Institution Name (e.g. Karakoram International University).
  - category MUST be Education.
  - totalAmount MUST be the final Total Payable amount (e.g. 55510).
  - lineItems should list itemized fees (e.g. Semester Fee, Late Surcharge).
- For Utility Bills (e.g. IESCO, LESCO, KE, PTCL, SNGPL):
  - merchantName should be the Utility Company (e.g. IESCO, PTCL).
  - category MUST be Utilities or Bills.
  - totalAmount MUST be the Total Payable / Amount Due.
- Identify the final payable amount using labels such as Total Payable, Total, Grand Total, Net Total, Amount Due, Balance Due.
- Normalize receiptDate to YYYY-MM-DD only when clearly readable.
- Currency should be PKR/Rs. if visible or implied by Pakistani receipts/vouchers.
- Category must be one of: Food, Transport, Rent, Bills, Education, Healthcare, Shopping, Entertainment, Travel, Utilities, Other.

Return JSON only in this shape:
{
  "ocrText": "full visible text transcription",
  "merchantName": { "value": "Institution or Store Name", "confidence": 0.9 },
  "totalAmount": { "value": 55510, "confidence": 0.9 },
  "currency": { "value": "PKR", "confidence": 0.9 },
  "subtotal": { "value": null, "confidence": 0.0 },
  "tax": { "value": null, "confidence": 0.0 },
  "discount": { "value": null, "confidence": 0.0 },
  "receiptDate": { "value": "YYYY-MM-DD or null", "confidence": 0.0 },
  "receiptTime": { "value": "HH:MM or null", "confidence": 0.0 },
  "category": { "value": "Education", "confidence": 0.9 },
  "paymentMethod": { "value": "Bank Transfer", "confidence": 0.8 },
  "description": { "value": "Karakoram International University — Semester Fee", "confidence": 0.85 },
  "lineItems": [
    { "name": "Semester Fee", "quantity": 1, "unitPrice": 54510, "totalPrice": 54510 },
    { "name": "Late Surcharge", "quantity": 1, "unitPrice": 1000, "totalPrice": 1000 }
  ]
}`;

function buildDataUri(fileBuffer: Buffer, fileName?: string, mimeType?: string) {
  const mime =
    mimeType ||
    (fileName?.toLowerCase().endsWith('.png')
      ? 'image/png'
      : fileName?.toLowerCase().endsWith('.webp')
        ? 'image/webp'
        : 'image/jpeg');
  return `data:${mime};base64,${fileBuffer.toString('base64')}`;
}

function adjustTotalWithOcr(
  totalAmount: ExtractedField<number>,
  ocrText: string,
  parsingNotes: string[]
): ExtractedField<number> {
  const labeled = extractTotalFromOcrText(ocrText);
  if (labeled.value === null) return totalAmount;

  if (totalAmount.value === null || totalAmount.value === 0) {
    parsingNotes.push(`Total inferred from OCR label "${labeled.label}".`);
    return { value: labeled.value, confidence: 0.85 };
  }

  const delta = Math.abs(labeled.value - totalAmount.value);
  const tolerance = Math.max(5, labeled.value * 0.03);
  if (delta > tolerance) {
    parsingNotes.push(
      `Vision total Rs. ${totalAmount.value} differed from OCR label "${labeled.label}" Rs. ${labeled.value}; using labeled total.`
    );
    return { value: labeled.value, confidence: Math.min(totalAmount.confidence, 0.85) };
  }

  parsingNotes.push(`Total confirmed against OCR label "${labeled.label}".`);
  return totalAmount;
}

function buildDescription(
  merchantName: ExtractedField<string>,
  lineItems: ReturnType<typeof sanitizeLineItems>,
  aiDescription: ExtractedField<string>
): ExtractedField<string> {
  if (aiDescription.value) return aiDescription;
  if (lineItems.length > 0) {
    const names = lineItems.slice(0, 3).map((item) => item.name).join(', ');
    return {
      value: merchantName.value ? `${merchantName.value} — ${names}` : names,
      confidence: Math.max(merchantName.confidence, 0.65),
    };
  }
  if (merchantName.value) {
    return { value: `${merchantName.value} Voucher / Payment`, confidence: merchantName.confidence * 0.8 };
  }
  return { value: 'Receipt Payment', confidence: 0.5 };
}

function normalizePaymentMethod(raw: string | null): ExtractedField<string> {
  if (!raw) return { value: 'Bank Transfer', confidence: 0.6 };
  const text = raw.trim().toLowerCase();
  if (text.includes('cash')) return { value: 'Cash', confidence: 0.9 };
  if (text.includes('credit')) return { value: 'Credit Card', confidence: 0.88 };
  if (text.includes('debit')) return { value: 'Debit Card', confidence: 0.88 };
  if (text.includes('wallet') || text.includes('easypaisa') || text.includes('jazzcash')) {
    return { value: 'Mobile Wallet', confidence: 0.85 };
  }
  if (text.includes('bank') || text.includes('transfer') || text.includes('hbl') || text.includes('meezan')) {
    return { value: 'Bank Transfer', confidence: 0.88 };
  }
  return { value: raw.trim(), confidence: 0.6 };
}

function enrichVisionPayload(payload: VisionReceiptPayload): ReceiptScanResult {
  const parsingNotes: string[] = [];
  const ocrText = String(payload.ocrText || '').trim();

  let merchantName = unwrapVisionField(payload.merchantName, (value) => {
    const text = String(value || '').trim();
    return text.length >= 2 ? text : null;
  }, 0.85);

  let totalAmount = unwrapVisionField(payload.totalAmount, parseMoney, 0.9);
  const subtotal = unwrapVisionField(payload.subtotal, parseMoney, 0.75);
  const tax = unwrapVisionField(payload.tax, parseMoney, 0.75);
  const discount = unwrapVisionField(payload.discount, parseMoney, 0.75);
  const receiptDateRaw = unwrapVisionField(payload.receiptDate, (value) => String(value || '').trim() || null, 0.85);
  const receiptDate = parseReceiptDate(receiptDateRaw.value);
  if (receiptDate.value && receiptDateRaw.confidence > receiptDate.confidence) {
    receiptDate.confidence = receiptDateRaw.confidence;
  }

  const receiptTimeRaw = unwrapVisionField(payload.receiptTime, (value) => String(value || '').trim() || null, 0.75);
  const receiptTime = parseReceiptTime(receiptTimeRaw.value);

  const currency = unwrapVisionField(payload.currency, (value) => {
    const text = String(value || '').trim();
    return text ? text.toUpperCase() : 'PKR';
  }, 0.8);

  const lineItems = sanitizeLineItems(payload.lineItems);
  totalAmount = adjustTotalWithOcr(totalAmount, ocrText, parsingNotes);

  const aiCategory = unwrapVisionField(payload.category, (value) => String(value || '').trim() || null, 0.75);
  const categoryInference = inferReceiptCategory({
    merchant: merchantName.value,
    lineItems,
    ocrText,
    aiCategory: aiCategory.value,
  });

  const paymentMethod = normalizePaymentMethod(
    unwrapVisionField(payload.paymentMethod, (value) => String(value || '').trim() || null, 0.75).value
  );

  const description = buildDescription(
    merchantName,
    lineItems,
    unwrapVisionField(payload.description, (value) => String(value || '').trim() || null, 0.7)
  );

  const category: ExtractedField<ExpenseCategory> = {
    value: categoryInference.category || 'Other',
    confidence: categoryInference.confidence || 0.8,
  };

  const warnings = buildReceiptWarnings({
    totalAmount,
    subtotal,
    tax,
    discount,
    receiptDate,
    merchantName,
    lineItems,
  });

  const confidence = overallConfidence([
    merchantName,
    totalAmount,
    receiptDate,
    category,
    paymentMethod,
  ]);

  const reviewRequired = totalAmount.value === null || totalAmount.value === 0;

  const result: ReceiptScanResult = {
    merchantName,
    totalAmount,
    currency,
    subtotal,
    tax,
    discount,
    receiptDate,
    receiptTime,
    category,
    paymentMethod,
    description,
    lineItems,
    confidence: Math.max(0.75, confidence),
    warnings,
    reviewRequired,
    extractionSource: 'openai_vision',
    categoryReason: categoryInference.reason,
  };

  if (config.nodeEnv === 'development') {
    result.debug = {
      ocrTextPreview: ocrText.slice(0, 500),
      totalLabelUsed: extractTotalFromOcrText(ocrText).label,
      parsingNotes,
    };
  }

  return result;
}

async function parseWithOpenAIVision(base64DataUrl: string): Promise<ReceiptScanResult> {
  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    throw new AppError('AI vision API key is not configured.', 503);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: VISION_SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all visible receipt, voucher, or bill fields from this document image.',
              },
              { type: 'image_url', image_url: { url: base64DataUrl, detail: 'high' } },
            ],
          },
        ],
        temperature: 0,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new AppError('AI vision request failed.', 502);
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new AppError('AI vision returned empty content.', 502);
    }

    const payload = JSON.parse(content) as VisionReceiptPayload;
    return enrichVisionPayload(payload);
  } finally {
    clearTimeout(timer);
  }
}

export async function parseReceiptData(
  fileBuffer?: Buffer,
  base64Image?: string,
  fileName?: string,
  mimeType?: string
): Promise<ReceiptScanResult> {
  if (!fileBuffer && !base64Image) {
    throw new AppError('Upload a receipt image or voucher document before scanning.', 400);
  }

  let buffer = fileBuffer;
  if (!buffer && base64Image) {
    const match = base64Image.match(/^data:(.+);base64,(.+)$/);
    if (match) {
      buffer = Buffer.from(match[2], 'base64');
      mimeType = mimeType || match[1];
    }
  }

  validateImageInput(buffer, mimeType, fileName);

  const base64Uri =
    base64Image && base64Image.startsWith('data:')
      ? base64Image
      : buildDataUri(buffer!, fileName, mimeType);

  // 1. Try AI Vision Engine
  try {
    const aiResult = await parseWithOpenAIVision(base64Uri);
    if (aiResult && aiResult.totalAmount.value !== null && aiResult.totalAmount.value > 0) {
      return aiResult;
    }
  } catch (err) {
    console.warn('AI Vision scan failed/errored; attempting local OCR engine fallback:', err);
  }

  // 2. Fallback to Tesseract.js OCR & Heuristic Document Parser
  const ocrText = await recognizeTextWithTesseract(buffer!);
  if (ocrText.trim().length > 0) {
    const ocrResult = parseReceiptFromText(ocrText, 'tesseract_ocr');
    if (ocrResult.totalAmount.value && ocrResult.totalAmount.value > 0) {
      return ocrResult;
    }
  }

  throw new AppError(
    'Could not extract data automatically from this receipt image. Upload a clearer photo or enter the expense manually.',
    422
  );
}
