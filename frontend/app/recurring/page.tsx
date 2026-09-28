'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '../../components/layout/AppLayout';
import { recurringService, RecurringTemplate } from '../../services/recurring.service';
import { fetchSubscriptions, SubscriptionsSummary } from '../../services/subscriptions.service';
import { ApiError } from '../../lib/api';
import { RefreshCw, Wallet, Receipt, Plus, CheckCircle2, AlertTriangle, Repeat, ShieldAlert, Sparkles } from 'lucide-react';

const currentMonth = () => new Date().toISOString().slice(0, 7);

export default function RecurringPage() {
  const [income, setIncome] = useState<RecurringTemplate[]>([]);
  const [expense, setExpense] = useState<RecurringTemplate[]>([]);
  const [subSummary, setSubSummary] = useState<SubscriptionsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [processResult, setProcessResult] = useState<string | null>(null);

  const loadData = async () => {
    setError('');
    setLoading(true);
    try {
      const [recRes, subRes] = await Promise.all([
        recurringService.list().catch(() => ({ income: [], expense: [] })),
        fetchSubscriptions().catch(() => ({ data: { subscriptions: [], totalMonthlyCommitments: 0, totalAnnualCommitments: 0, activeCount: 0, priceIncreaseAlerts: [] } })),
      ]);
      setIncome(recRes.income);
      setExpense(recRes.expense);
      setSubSummary(subRes.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load subscriptions and recurring items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleProcess = async () => {
    setProcessing(true);
    setError('');
    setProcessResult(null);
    try {
      const res = await recurringService.process(currentMonth());
      const { created, skipped } = res.result;
      const total = created.income + created.expense;
      if (total === 0) {
        setProcessResult(`No new entries needed for ${res.result.month}. ${skipped.income + skipped.expense} already posted.`);
      } else {
        setProcessResult(`Created ${created.income} income and ${created.expense} expense entries for ${res.result.month}.`);
      }
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to process recurring entries.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div>
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Recurring Commitments</span>
            <h1 className="text-2xl md:text-3xl font-bold text-ink-900 mt-1">
              Bills &amp; Subscriptions
            </h1>
            <p className="text-slate-500 text-xs md:text-sm mt-1">
              Automated subscription intelligence · Price change alerts · Monthly auto-posting
            </p>
          </div>
          <button
            type="button"
            onClick={handleProcess}
            disabled={processing}
            className="px-5 py-2.5 rounded-xl bg-ink-900 hover:bg-ink-800 text-white font-semibold text-sm flex items-center gap-2 shadow-xs transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${processing ? 'animate-spin' : ''}`} />
            {processing ? 'Processing…' : 'Process This Month'}
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
        )}

        {processResult && (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{processResult}</span>
          </div>
        )}

        {subSummary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Monthly Commitments</span>
              <h3 className="text-2xl font-bold text-ink-900">Rs. {subSummary.totalMonthlyCommitments.toLocaleString()} / mo</h3>
              <p className="text-xs text-slate-500">{subSummary.activeCount} active subscriptions &amp; recurring bills</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Annual Commitments</span>
              <h3 className="text-2xl font-bold text-ink-900">Rs. {subSummary.totalAnnualCommitments.toLocaleString()} / yr</h3>
              <p className="text-xs text-slate-500">Projected 12-month recurring expenditure</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Price Alerts</span>
              <h3 className="text-2xl font-bold text-ink-900">{subSummary.priceIncreaseAlerts.length} Alerts</h3>
              <p className="text-xs text-slate-500">Subscription price changes detected</p>
            </div>
          </div>
        )}

        {subSummary?.priceIncreaseAlerts && subSummary.priceIncreaseAlerts.length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-800">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span>Subscription Price Increase Detected</span>
            </div>
            <ul className="list-disc list-inside text-xs space-y-1 text-amber-800">
              {subSummary.priceIncreaseAlerts.map((alert, idx) => (
                <li key={idx}>{alert}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Link
            href="/income"
            className="px-5 py-2.5 rounded-xl bg-ink-900 hover:bg-ink-800 text-white text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Recurring Income
          </Link>
          <Link
            href="/expenses"
            className="px-5 py-2.5 rounded-xl bg-white hover:bg-ink-50 text-ink-900 text-sm font-semibold flex items-center gap-2 border border-ink-900 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Recurring Expense
          </Link>
        </div>

        {loading ? (
          <div className="h-40 bg-slate-100 animate-pulse rounded-2xl" />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-lg text-ink-900 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-600" /> Recurring Income ({income.length})
              </h3>
              {income.length === 0 ? (
                <p className="text-xs text-slate-500 py-4">No recurring income yet. Add salary or other regular earnings with the recurring flag.</p>
              ) : (
                <div className="space-y-2">
                  {income.map((item) => (
                    <div key={item.fingerprint} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-slate-900">{item.label}</p>
                        <p className="text-slate-500 mt-0.5">{item.incomeType} · Last: {item.lastDate}</p>
                      </div>
                      <span className="font-bold text-emerald-600">Rs. {item.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-lg text-ink-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" /> Auto-Identified Subscriptions ({subSummary?.subscriptions.length || 0})
              </h3>
              {subSummary?.subscriptions.length === 0 ? (
                <p className="text-xs text-slate-500 py-4">No recurring payment subscriptions detected yet.</p>
              ) : (
                <div className="space-y-2">
                  {subSummary?.subscriptions.map((sub) => (
                    <div key={sub.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900">{sub.merchant}</p>
                          {sub.status === 'INCREASED' && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">Price Increased</span>
                          )}
                        </div>
                        <p className="text-slate-500 mt-0.5">{sub.category} · Next expected: {sub.nextExpectedDate}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900">Rs. {sub.monthlyEquivalent.toLocaleString()}/mo</p>
                        <p className="text-[11px] text-slate-400">Rs. {sub.annualEquivalent.toLocaleString()}/yr</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
