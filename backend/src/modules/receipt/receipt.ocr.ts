import { createWorker } from 'tesseract.js';
import { inferReceiptCategory } from './receipt.category.js';
import {
  extractTotalFromOcrText,
  parseMoney,
  parseReceiptDate,
  sanitizeLineItems,
} from './receipt.validation.js';
import { ExpenseCategory } from '../expense/expense.model.js';
import { ExtractedField, ReceiptScanResult } from './receipt.types.js';

export async function recognizeTextWithTesseract(imageBuffer: Buffer): Promise<string> {
  try {
    const worker = await createWorker('eng');
    const ret = await worker.recognize(imageBuffer);
    await worker.terminate();
    return ret.data.text || '';
  } catch (err) {
    console.warn('Tesseract OCR failed or unavailable:', err);
    return '';
  }
}

export function parseReceiptFromText(ocrText: string, extractionSource: 'openai_vision' | 'tesseract_ocr' = 'tesseract_ocr'): ReceiptScanResult {
  const lines = ocrText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // 1. Merchant / Institution Name Extraction
  let merchant: string | null = null;
  const merchantPatterns = [
    /(karakoram\s+international\s+university|university|college|school|academy|institute|faculty)/i,
    /(iesco|lesco|kelectric|k-electric|sngpl|ssgc|ptcl|stormfiber|nayatel|utility)/i,
    /(hbl|meezan|alfalah|standard\s+chartered|nayapay|jazzcash|easypaisa|bank)/i,
    /(mcdonald|kfc|pizza\s+hut|domino|subway|foodpanda|supermarket|imtiaz|carrefour|metro|daraz)/i,
  ];

  for (const line of lines) {
    for (const pat of merchantPatterns) {
      if (pat.test(line)) {
        merchant = line.replace(/bank\s+copy|accounts\s+copy|student\s+copy/gi, '').trim();
        break;
      }
    }
    if (merchant) break;
  }

  if (!merchant && lines.length > 0) {
    const candidate = lines[0].replace(/[^\w\s&.-]/g, '').trim();
    if (candidate.length >= 3) merchant = candidate;
  }

  const merchantName: ExtractedField<string> = {
    value: merchant || 'Receipt Merchant',
    confidence: merchant ? 0.85 : 0.6,
  };

  // 2. Total Amount Extraction
  const labeledTotal = extractTotalFromOcrText(ocrText);
  let finalTotal: number | null = labeledTotal.value;

  if (finalTotal === null) {
    // Scan for monetary amounts
    const amounts: number[] = [];
    for (const line of lines) {
      if (/total|payable|net|amount|fee|surcharge|rs|pkr/i.test(line)) {
        const val = parseMoney(line);
        if (val !== null && val > 0 && val < 50_000_000) {
          amounts.push(val);
        }
      }
    }
    if (amounts.length > 0) {
      finalTotal = Math.max(...amounts);
    } else {
      // Fallback: search any line for numbers
      for (const line of lines) {
        const val = parseMoney(line);
        if (val !== null && val >= 50 && val < 50_000_000) {
          amounts.push(val);
        }
      }
      if (amounts.length > 0) {
        finalTotal = Math.max(...amounts);
      }
    }
  }

  const totalAmount: ExtractedField<number> = {
    value: finalTotal || 0,
    confidence: finalTotal ? 0.85 : 0.5,
  };

  // 3. Receipt Date
  let dateVal: string | null = null;
  for (const line of lines) {
    const d = parseReceiptDate(line);
    if (d.value) {
      dateVal = d.value;
      break;
    }
  }

  const receiptDate: ExtractedField<string> = {
    value: dateVal || new Date().toISOString().slice(0, 10),
    confidence: dateVal ? 0.85 : 0.6,
  };

  // 4. Line Items Extraction
  const lineItems: any[] = [];
  for (const line of lines) {
    const match = line.match(/(?:^|\d+[\.\)])\s*([a-zA-Z\s\(\)\/-]{3,40})\s+(?:rs\.?|pkr)?\s*([\d,]+(?:\.\d+)?)/i);
    if (match) {
      const name = match[1].trim();
      const price = parseMoney(match[2]);
      if (name && price && price > 0 && !/total|payable|words|cnic|ref/i.test(name)) {
        lineItems.push({
          name,
          quantity: 1,
          unitPrice: price,
          totalPrice: price,
        });
      }
    }
  }

  // 5. Category Inference
  const categoryInference = inferReceiptCategory({
    merchant: merchantName.value,
    lineItems: sanitizeLineItems(lineItems),
    ocrText,
    aiCategory: null,
  });

  const category: ExtractedField<ExpenseCategory> = {
    value: categoryInference.category || 'Other',
    confidence: categoryInference.confidence || 0.7,
  };

  // 6. Payment Method
  let pm = 'Bank Transfer';
  if (/cash/i.test(ocrText)) pm = 'Cash';
  else if (/credit/i.test(ocrText)) pm = 'Credit Card';
  else if (/debit/i.test(ocrText)) pm = 'Debit Card';
  else if (/wallet|easypaisa|jazzcash/i.test(ocrText)) pm = 'Mobile Wallet';

  const paymentMethod: ExtractedField<string> = {
    value: pm,
    confidence: 0.8,
  };

  const description: ExtractedField<string> = {
    value: merchantName.value
      ? lineItems.length > 0
        ? `${merchantName.value} — ${lineItems.map((i) => i.name).join(', ')}`
        : `${merchantName.value} Voucher / Receipt`
      : 'Receipt Payment',
    confidence: 0.8,
  };

  return {
    merchantName,
    totalAmount,
    currency: { value: 'PKR', confidence: 0.9 },
    subtotal: { value: null, confidence: 0 },
    tax: { value: null, confidence: 0 },
    discount: { value: null, confidence: 0 },
    receiptDate,
    receiptTime: { value: null, confidence: 0 },
    category,
    paymentMethod,
    description,
    lineItems: sanitizeLineItems(lineItems),
    confidence: 0.8,
    warnings: [],
    reviewRequired: false,
    extractionSource,
    categoryReason: categoryInference.reason,
  };
}
