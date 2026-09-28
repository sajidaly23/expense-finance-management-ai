'use client';

import React, { useState } from 'react';
import { X, Upload, Camera, Sparkles, Check, AlertCircle, PlusCircle, MinusCircle } from 'lucide-react';
import { uploadReceipt } from '../../services/receipt.service';
import { apiRequest } from '../../lib/api';

interface QuickActionModalProps {
  type: 'INCOME' | 'EXPENSE' | 'OCR';
  onClose: () => void;
  onSuccess?: () => void;
}

export default function QuickActionModal({ type, onClose, onSuccess }: QuickActionModalProps) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(type === 'INCOME' ? 'Salary' : 'Food');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState(type === 'INCOME' ? 'Bank Transfer' : 'Cash');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ocrSuccess, setOcrSuccess] = useState<string | null>(null);

  // File upload state for OCR
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (type === 'OCR') {
        if (!file) throw new Error('Please select a receipt image or document.');
        const res = await uploadReceipt(file);
        const parsed = res.receipt;
        setOcrSuccess(
          `Extracted Rs. ${parsed.totalAmount?.value || 0} (${parsed.merchantName?.value || 'Merchant'}) — ${parsed.category?.value || 'Category'}`
        );
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1800);
        return;
      }

      const payload = {
        type,
        amount: parseFloat(amount),
        category,
        incomeType: category,
        description,
        date,
        paymentMethod,
      };

      await apiRequest('/api/transactions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Operation failed. Please verify fields.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const title =
    type === 'INCOME' ? 'Log New Income' : type === 'EXPENSE' ? 'Record Expense' : 'AI Receipt Scanner (OCR)';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl text-white shadow-sm ${
                type === 'INCOME'
                  ? 'bg-emerald-600'
                  : type === 'EXPENSE'
                  ? 'bg-rose-600'
                  : 'bg-indigo-600'
              }`}
            >
              {type === 'OCR' ? (
                <Camera className="w-5 h-5" />
              ) : type === 'INCOME' ? (
                <PlusCircle className="w-5 h-5" />
              ) : (
                <MinusCircle className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100 leading-tight">{title}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated Gmail receipt &amp; WhatsApp notification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-medium text-xs leading-relaxed">{error}</span>
            </div>
          )}

          {ocrSuccess && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 rounded-xl flex items-center gap-2.5 font-semibold text-xs">
              <Check className="w-4 h-4 shrink-0" />
              <span>{ocrSuccess}</span>
            </div>
          )}

          {type === 'OCR' ? (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-6 text-center bg-slate-950/60 transition-colors cursor-pointer">
                <Camera className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs text-slate-200 font-semibold">Upload receipt photo or invoice</p>
                <p className="text-[11px] text-slate-400 mt-1">PNG, JPG, JPEG or PDF (Max 10MB)</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="mt-3 block w-full text-xs text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                />
              </div>
              {file && (
                <p className="text-emerald-600 font-semibold text-center text-xs">Selected: {file.name}</p>
              )}
            </div>
          ) : (
            <>
              <div>
                <label className="block font-semibold text-slate-300 uppercase tracking-wider text-[11px] mb-1.5">
                  Amount in PKR *
                </label>
                <input
                  type="number"
                  placeholder="e.g. 5000"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 font-bold placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 uppercase tracking-wider text-[11px] mb-1.5">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
                  >
                    {type === 'INCOME' ? (
                      <>
                        <option value="Salary">Salary</option>
                        <option value="Freelance">Freelance</option>
                        <option value="Business">Business</option>
                        <option value="Investment">Investment</option>
                        <option value="Gift">Gift / Bonus</option>
                        <option value="Other">Other</option>
                      </>
                    ) : (
                      <>
                        <option value="Food">Food &amp; Dining</option>
                        <option value="Transport">Transport / Fuel</option>
                        <option value="Utilities">Utilities &amp; Bills</option>
                        <option value="Rent">Rent</option>
                        <option value="Shopping">Shopping</option>
                        <option value="Healthcare">Healthcare</option>
                        <option value="Entertainment">Entertainment</option>
                        <option value="Education">Education</option>
                        <option value="Other">Other</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 uppercase tracking-wider text-[11px] mb-1.5">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Mobile Wallet">Mobile Wallet (Easypaisa / Nayapay)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 uppercase tracking-wider text-[11px] mb-1.5">
                  Description / Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Client project, Groceries, Lunch"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 uppercase tracking-wider text-[11px] mb-1.5">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
                />
              </div>
            </>
          )}

          <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-semibold text-xs transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-5 py-2 rounded-xl text-white font-semibold text-xs transition-all shadow-md ${
                type === 'INCOME'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                  : type === 'EXPENSE'
                  ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'
              } disabled:opacity-60`}
            >
              {loading ? 'Processing...' : type === 'OCR' ? 'Scan & Extract' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
