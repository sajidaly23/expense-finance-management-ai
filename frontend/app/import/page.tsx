'use client';

import { DragEvent, useRef, useState } from 'react';
import Link from 'next/link';
import AppLayout from '../../components/layout/AppLayout';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Wallet,
  Receipt,
  Sparkles,
  BarChart3,
  FileText,
  Loader2,
  CloudUpload,
} from 'lucide-react';
import { importService, ImportCommitResponse, ImportPreviewResponse } from '../../services/import.service';
import { ApiError } from '../../lib/api';

function formatRs(amount: number) {
  return `Rs. ${Math.round(amount).toLocaleString()}`;
}

const STEPS = [
  { id: 1, label: 'Download template' },
  { id: 2, label: 'Upload file' },
  { id: 3, label: 'Review preview' },
  { id: 4, label: 'Import rows' },
];

function activeStep(preview: ImportPreviewResponse | null, result: ImportCommitResponse | null, file: File | null) {
  if (result) return 4;
  if (preview) return 3;
  if (file) return 2;
  return 1;
}

export default function ImportPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [result, setResult] = useState<ImportCommitResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  const step = activeStep(preview, result, file);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDownload = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Download failed.');
    }
  };

  const processFile = async (selected: File | null) => {
    reset();
    if (!selected) return;

    setFile(selected);
    setLoading(true);
    try {
      setPreview(await importService.preview(selected));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to read the Excel file.');
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) void processFile(dropped);
  };

  const handleImport = async () => {
    if (!file || !preview?.ready) return;
    setImporting(true);
    setError('');
    try {
      setResult(await importService.commit(file));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 p-6 md:p-8">
          <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-teal-500/10 blur-3xl" />
          <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 typo-overline tracking-wider text-emerald-400">
                <Sparkles className="w-3.5 h-3.5" /> Bulk data import
              </div>
              <h1 className="text-3xl md:text-4xl font-display font-semibold text-slate-100">
                Import from Excel or CSV
              </h1>
              <p className="text-slate-400 text-sm md:text-base leading-relaxed">
                Bring in income and expenses in one go. Dashboard, budgets, analytics, health score, and reports update
                automatically from your uploaded ledger.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {STEPS.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium border transition-colors ${
                    step >= item.id
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-slate-800 bg-slate-950/60 text-slate-500'
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                      step >= item.id ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {step > item.id ? '✓' : item.id}
                  </span>
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Templates */}
        {!result && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => void handleDownload(() => importService.downloadTemplate())}
              className="group text-left p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/30 hover:bg-slate-900/80 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition-transform">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <Download className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
              </div>
              <p className="font-semibold text-slate-100">Excel workbook</p>
              <p className="text-xs text-slate-400 mt-1">Income + Expenses sheets with sample rows (.xlsx)</p>
            </button>

            <button
              type="button"
              onClick={() => void handleDownload(() => importService.downloadIncomeCsv())}
              className="group text-left p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-teal-500/30 hover:bg-slate-900/80 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 group-hover:scale-105 transition-transform">
                  <Wallet className="w-5 h-5" />
                </div>
                <Download className="w-4 h-4 text-slate-500 group-hover:text-teal-400 transition-colors" />
              </div>
              <p className="font-semibold text-slate-100">Income CSV</p>
              <p className="text-xs text-slate-400 mt-1">Open in TextEdit or Google Sheets — upload separately</p>
            </button>

            <button
              type="button"
              onClick={() => void handleDownload(() => importService.downloadExpensesCsv())}
              className="group text-left p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/30 hover:bg-slate-900/80 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-105 transition-transform">
                  <Receipt className="w-5 h-5" />
                </div>
                <Download className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
              </div>
              <p className="font-semibold text-slate-100">Expenses CSV</p>
              <p className="text-xs text-slate-400 mt-1">Category, payment method, Need/Want columns included</p>
            </button>
          </div>
        )}

        {/* Upload zone */}
        {!result && (
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`relative rounded-3xl border-2 border-dashed p-8 md:p-12 transition-all ${
              dragging
                ? 'border-emerald-400 bg-emerald-500/5 scale-[1.01]'
                : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              className="hidden"
              onChange={(event) => void processFile(event.target.files?.[0] || null)}
            />

            <div className="flex flex-col items-center text-center space-y-4">
              <div className={`p-4 rounded-2xl border ${dragging ? 'bg-emerald-500/15 border-emerald-500/30' : 'bg-slate-950 border-slate-800'}`}>
                {loading ? (
                  <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
                ) : (
                  <CloudUpload className={`w-10 h-10 ${dragging ? 'text-emerald-400' : 'text-slate-400'}`} />
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-100">
                  {loading ? 'Validating your file…' : 'Drop your file here'}
                </h2>
                <p className="text-sm text-slate-400 mt-1">or click below · .xlsx, .xls, .csv · max 5 MB</p>
              </div>
              {file && !loading && (
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 border border-slate-800 px-4 py-2 text-sm text-slate-300">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  {file.name}
                </div>
              )}
              <button
                type="button"
                disabled={loading}
                onClick={() => inputRef.current?.click()}
                className="px-6 py-3 rounded-xl bg-ink-900 hover:bg-ink-800 disabled:opacity-50 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-black/20"
              >
                <Upload className="w-4 h-4" />
                {file ? 'Choose another file' : 'Browse files'}
              </button>
            </div>
          </div>
        )}

        {/* Preview */}
        {preview && !result && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Income rows', value: preview.incomeCount, sub: formatRs(preview.incomeTotal), color: 'text-emerald-400', icon: Wallet },
                { label: 'Expense rows', value: preview.expenseCount, sub: formatRs(preview.expenseTotal), color: 'text-amber-400', icon: Receipt },
                { label: 'Net from file', value: formatRs(preview.netFromFile), sub: 'Income − expenses', color: 'text-teal-400', icon: BarChart3 },
                {
                  label: 'Need / Want',
                  value: `${formatRs(preview.needsTotal)}`,
                  sub: formatRs(preview.wantsTotal),
                  color: 'text-slate-200',
                  icon: Sparkles,
                },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{card.label}</p>
                      <Icon className="w-4 h-4 text-slate-500" />
                    </div>
                    <p className="text-2xl font-display font-semibold text-slate-100">{card.value}</p>
                    <p className={`text-xs mt-1 ${card.color}`}>{card.sub}</p>
                  </div>
                );
              })}
            </div>

            {preview.errorCount > 0 && (
              <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-r from-amber-500/10 to-orange-500/5 p-5 space-y-3">
                <div className="flex items-center gap-2 text-amber-300 text-sm font-semibold">
                  <AlertTriangle className="w-4 h-4" />
                  {preview.errorCount} row{preview.errorCount === 1 ? '' : 's'} need fixing before import
                </div>
                <div className="space-y-1.5 max-h-44 overflow-y-auto text-xs text-amber-100/90 custom-scrollbar">
                  {preview.errors.map((item) => (
                    <p key={`${item.sheet}-${item.row}-${item.message}`} className="rounded-lg bg-slate-950/50 px-3 py-2">
                      <span className="font-mono text-amber-300">{item.sheet} · row {item.row}</span>
                      <span className="text-slate-300"> — {item.message}</span>
                    </p>
                  ))}
                </div>
              </div>
            )}

            {(preview.incomes.length > 0 || preview.expenses.length > 0) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {preview.incomes.length > 0 && (
                  <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900">
                    <p className="px-4 py-3 bg-slate-950 text-sm font-semibold text-emerald-400 flex items-center gap-2">
                      <Wallet className="w-4 h-4" /> Income preview
                    </p>
                    <div className="divide-y divide-slate-800">
                      {preview.incomes.map((row) => (
                        <p key={`income-${row.row}`} className="px-4 py-3 text-xs text-slate-300 flex justify-between gap-3">
                          <span>{row.date} · {row.source}</span>
                          <span className="font-semibold text-emerald-400 shrink-0">{formatRs(row.amount)}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                {preview.expenses.length > 0 && (
                  <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900">
                    <p className="px-4 py-3 bg-slate-950 text-sm font-semibold text-amber-400 flex items-center gap-2">
                      <Receipt className="w-4 h-4" /> Expense preview
                    </p>
                    <div className="divide-y divide-slate-800">
                      {preview.expenses.map((row) => (
                        <p key={`expense-${row.row}`} className="px-4 py-3 text-xs text-slate-300 flex justify-between gap-3">
                          <span>{row.date} · {row.category} · {row.description}</span>
                          <span className="font-semibold text-amber-400 shrink-0">{formatRs(row.amount)}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              disabled={!preview.ready || importing}
              onClick={() => void handleImport()}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Importing…
                </>
              ) : (
                <>
                  Import {preview.incomeCount + preview.expenseCount} rows <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Success */}
        {result && (
          <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-slate-900 to-emerald-950/30 p-6 md:p-8 space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-display font-semibold text-slate-100">Import complete</h2>
                <p className="text-sm text-slate-400 mt-1">{result.message}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Imported income</p>
                <p className="text-2xl font-semibold text-slate-100 mt-1">{result.imported.incomeCount}</p>
                <p className="text-sm text-emerald-400 mt-1">{formatRs(result.imported.incomeTotal)}</p>
              </div>
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Imported expenses</p>
                <p className="text-2xl font-semibold text-slate-100 mt-1">{result.imported.expenseCount}</p>
                <p className="text-sm text-amber-400 mt-1">{formatRs(result.imported.expenseTotal)}</p>
              </div>
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800">
                <p className="text-xs text-slate-400 uppercase tracking-wide">{result.currentMonth.label} now</p>
                <p className="text-sm text-slate-200 mt-2">Income {formatRs(result.currentMonth.income)}</p>
                <p className="text-sm text-slate-200">Expenses {formatRs(result.currentMonth.expense)}</p>
                <p className="text-sm text-teal-400 font-medium mt-1">
                  Savings {formatRs(result.currentMonth.savings)} ({result.currentMonth.savingsRate}%)
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="px-5 py-2.5 rounded-xl bg-ink-900 hover:bg-ink-800 text-white text-sm font-medium flex items-center gap-2"
              >
                Open dashboard <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/analytics"
                className="px-5 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-950 text-slate-200 text-sm font-medium"
              >
                View analytics
              </Link>
              <button
                type="button"
                onClick={reset}
                className="px-5 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-950 text-slate-400 text-sm font-medium"
              >
                Import another file
              </button>
            </div>
          </div>
        )}

        {/* Help */}
        {!result && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <p className="text-sm font-semibold text-slate-200 mb-2">Don&apos;t have Excel?</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Use the <strong className="text-teal-300">Income CSV</strong> and{' '}
                <strong className="text-amber-300">Expenses CSV</strong> templates above. Edit them in any spreadsheet
                app or text editor, then upload each file one at a time on this page.
              </p>
              <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                You can also open the CSV in Google Sheets, add your rows, and export as .xlsx if you prefer a single
                workbook with both sheets.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-400 space-y-2">
              <p className="text-sm font-semibold text-slate-200">Required columns</p>
              <p>
                <span className="text-emerald-400 font-medium">Income:</span> amount, source, date, incomeType,
                description, recurring
              </p>
              <p>
                <span className="text-amber-400 font-medium">Expenses:</span> amount, description, category,
                subcategory, date, paymentMethod, transactionType, recurring
              </p>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
