'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '../../../components/layout/AppLayout';
import { Camera, Upload, Check, AlertCircle, ArrowLeft, Sparkles, AlertTriangle } from 'lucide-react';
import { uploadReceipt, ParsedReceipt } from '../../../services/receipt.service';
import { expenseService } from '../../../services/expense.service';
import { ApiError } from '../../../lib/api';

const CATEGORIES = [
  'Food',
  'Transport',
  'Rent',
  'Bills',
  'Education',
  'Healthcare',
  'Shopping',
  'Entertainment',
  'Travel',
  'Utilities',
  'Other',
] as const;

const PAYMENT_METHODS = ['Cash', 'Debit Card', 'Credit Card', 'Bank Transfer', 'Mobile Wallet', 'Other'] as const;

function displayValue(value: string | number | null | undefined, prefix = '') {
  if (value === null || value === undefined || value === '') return 'Not detected';
  if (typeof value === 'number') return `${prefix}${value.toLocaleString()}`;
  return `${prefix}${value}`;
}

function confidenceLabel(confidence: number) {
  if (confidence >= 0.85) return 'High';
  if (confidence >= 0.65) return 'Medium';
  return 'Low';
}

export default function ReceiptScanPage() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [parsed, setParsed] = useState<ParsedReceipt | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    amount: '',
    subtotal: '',
    tax: '',
    description: '',
    category: 'Other',
    date: '',
    time: '',
    paymentMethod: '',
    transactionType: 'NEED' as 'NEED' | 'WANT',
  });

  const applyParsedReceipt = (receipt: ParsedReceipt) => {
    setParsed(receipt);
    setForm({
      amount: receipt.totalAmount.value !== null ? String(receipt.totalAmount.value) : '',
      subtotal: receipt.subtotal.value !== null ? String(receipt.subtotal.value) : '',
      tax: receipt.tax.value !== null ? String(receipt.tax.value) : '',
      description: receipt.description.value || receipt.merchantName.value || '',
      category: receipt.category.value || 'Other',
      date: receipt.receiptDate.value || '',
      time: receipt.receiptTime.value || '',
      paymentMethod: receipt.paymentMethod.value || '',
      transactionType: 'NEED',
    });
  };

  const handleFileChange = async (selectedFile: File) => {
    setScanning(true);
    setError('');
    setParsed(null);

    try {
      const res = await uploadReceipt(selectedFile);
      applyParsedReceipt(res.receipt);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Receipt parsing failed. Try a clearer image.');
    } finally {
      setScanning(false);
    }
  };

  const handleSave = async () => {
    if (!form.amount || !form.description) {
      setError('Provide amount and description before saving.');
      return;
    }
    if (!form.date) {
      setError('Receipt date is required. Enter the date printed on the receipt.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await expenseService.create({
        amount: parseFloat(form.amount),
        description: form.description,
        category: form.category as (typeof CATEGORIES)[number],
        date: form.date,
        paymentMethod: (form.paymentMethod || 'Other') as (typeof PAYMENT_METHODS)[number],
        transactionType: form.transactionType,
        recurring: false,
      });
      router.push('/expenses');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save scanned expense.');
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/expenses')}
            className="p-2 text-[#1E293B] hover:text-[#0F172A] rounded-xl hover:bg-[#F1F5F9] transition-colors border border-[#CBD5E1]"
            title="Back to Expenses"
          >
            <ArrowLeft className="w-5 h-5 text-[#0F172A]" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">AI Receipt Scanner</h1>
            <p className="text-sm font-semibold text-[#334155] mt-0.5">
              Upload a receipt photo. SmartFin reads the actual image with AI vision — nothing is guessed or fabricated.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {!parsed ? (
          <div className="p-12 rounded-2xl bg-white border-2 border-dashed border-[#CBD5E1] text-center space-y-5 hover:border-emerald-600 transition-all shadow-sm">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
              <Camera className="w-8 h-8 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#0F172A]">Upload or drop your receipt image</h3>
              <p className="text-xs text-[#475569] font-semibold mt-1">Supports PNG, JPG, JPEG, WEBP up to 10MB</p>
            </div>
            <label className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-sm cursor-pointer shadow-md transition-colors">
              <Upload className="w-4 h-4 text-white" />
              <span className="text-white font-bold">Select Receipt Photo</span>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) void handleFileChange(e.target.files[0]);
                }}
              />
            </label>

            {scanning && (
              <div className="pt-4 text-xs font-bold text-emerald-800 animate-pulse flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Analyzing receipt image with AI vision…</span>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                <span className="text-xs font-black text-[#475569] uppercase tracking-wider">Extracted Receipt Data</span>
                <span
                  className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${
                    parsed.confidence >= 0.85
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : parsed.confidence >= 0.65
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  {Math.round(parsed.confidence * 100)}% · {confidenceLabel(parsed.confidence)}
                </span>
              </div>

              {parsed.reviewRequired && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Please review the extracted fields carefully before saving.</span>
                </div>
              )}

              {parsed.warnings.length > 0 && (
                <div className="space-y-2">
                  {parsed.warnings.map((warning) => (
                    <div key={warning} className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      {warning}
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3 text-sm">
                {[
                  ['Merchant', displayValue(parsed.merchantName.value), parsed.merchantName.confidence],
                  ['Total Amount', displayValue(parsed.totalAmount.value, 'Rs. '), parsed.totalAmount.confidence],
                  ['Subtotal', displayValue(parsed.subtotal.value, 'Rs. '), parsed.subtotal.confidence],
                  ['Tax', displayValue(parsed.tax.value, 'Rs. '), parsed.tax.confidence],
                  ['Discount', displayValue(parsed.discount.value, 'Rs. '), parsed.discount.confidence],
                  ['Date', displayValue(parsed.receiptDate.value), parsed.receiptDate.confidence],
                  ['Time', displayValue(parsed.receiptTime.value), parsed.receiptTime.confidence],
                  ['Category', displayValue(parsed.category.value), parsed.category.confidence],
                  ['Payment Method', displayValue(parsed.paymentMethod.value), parsed.paymentMethod.confidence],
                  ['Description', displayValue(parsed.description.value), parsed.description.confidence],
                ].map(([label, value, confidence]) => (
                  <div key={label} className="flex justify-between gap-4 py-1 border-b border-[#F1F5F9]">
                    <span className="text-[#475569] font-semibold">{label}</span>
                    <div className="text-right">
                      <span className="font-extrabold text-[#0F172A]">{value}</span>
                      <p className="text-[10px] text-[#64748B] font-semibold">
                        {Number(confidence) > 0 ? `${Math.round(Number(confidence) * 100)}% field confidence` : 'Not detected'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {parsed.categoryReason && (
                <p className="text-xs text-[#64748B] font-medium">Category reason: {parsed.categoryReason}</p>
              )}

              {parsed.lineItems.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs font-bold text-[#475569] mb-2 uppercase tracking-wide">Line Items</p>
                  <div className="space-y-2 text-xs bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E2E8F0]">
                    {parsed.lineItems.map((item, idx) => (
                      <div key={`${item.name}-${idx}`} className="flex justify-between gap-3 text-[#1E293B]">
                        <div>
                          <p className="font-semibold">{item.name}</p>
                          {(item.quantity !== null || item.unitPrice !== null) && (
                            <p className="text-[#64748B]">
                              {item.quantity !== null ? `Qty ${item.quantity}` : ''}
                              {item.unitPrice !== null ? ` · Unit Rs. ${item.unitPrice.toLocaleString()}` : ''}
                            </p>
                          )}
                        </div>
                        <span className="font-extrabold text-[#0F172A]">
                          {item.totalPrice !== null ? `Rs. ${item.totalPrice.toLocaleString()}` : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-black text-[#0F172A]">Review &amp; Confirm Transaction</h3>
                <p className="text-xs font-semibold text-[#475569]">
                  Edit any field below. Saved values come from your edits, not the original extraction.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-[#1E293B] mb-1.5">Description / Merchant</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full p-3 rounded-xl border border-[#CBD5E1] bg-white text-[#0F172A] font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-[#1E293B] mb-1.5">Total Amount (Rs.)</label>
                    <input
                      type="number"
                      step="any"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      className="w-full p-3 rounded-xl border border-[#CBD5E1] bg-white text-[#0F172A] font-black text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#1E293B] mb-1.5">Subtotal (Rs.)</label>
                    <input
                      type="number"
                      step="any"
                      value={form.subtotal}
                      onChange={(e) => setForm({ ...form, subtotal: e.target.value })}
                      className="w-full p-3 rounded-xl border border-[#CBD5E1] bg-white text-[#0F172A] font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#1E293B] mb-1.5">Tax (Rs.)</label>
                    <input
                      type="number"
                      step="any"
                      value={form.tax}
                      onChange={(e) => setForm({ ...form, tax: e.target.value })}
                      className="w-full p-3 rounded-xl border border-[#CBD5E1] bg-white text-[#0F172A] font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#1E293B] mb-1.5">Category</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full p-3 rounded-xl border border-[#CBD5E1] bg-white text-[#0F172A] font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    >
                      {CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-[#1E293B] mb-1.5">Payment Method</label>
                    <select
                      value={form.paymentMethod}
                      onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                      className="w-full p-3 rounded-xl border border-[#CBD5E1] bg-white text-[#0F172A] font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    >
                      <option value="">Not detected / select manually</option>
                      {PAYMENT_METHODS.map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#1E293B] mb-1.5">Receipt Date</label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="w-full p-3 rounded-xl border border-[#CBD5E1] bg-white text-[#0F172A] font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#1E293B] mb-1.5">Receipt Time</label>
                    <input
                      type="time"
                      value={form.time}
                      onChange={(e) => setForm({ ...form, time: e.target.value })}
                      className="w-full p-3 rounded-xl border border-[#CBD5E1] bg-white text-[#0F172A] font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#1E293B] mb-1.5">Need vs Want</label>
                  <select
                    value={form.transactionType}
                    onChange={(e) => setForm({ ...form, transactionType: e.target.value as 'NEED' | 'WANT' })}
                    className="w-full p-3 rounded-xl border border-[#CBD5E1] bg-white text-[#0F172A] font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="NEED">Need</option>
                    <option value="WANT">Want</option>
                  </select>
                </div>

                <div className="pt-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setParsed(null);
                      setError('');
                    }}
                    className="flex-1 py-3 rounded-xl border border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC] font-extrabold transition-colors text-sm"
                  >
                    Rescan
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={saving}
                    className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                  >
                    <Check className="w-4 h-4 text-white" />
                    <span>{saving ? 'Saving...' : 'Confirm & Save'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
