'use client';

import { useState } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { advancedService, TaxEstimate } from '../../services/advanced.service';
import { ApiError } from '../../lib/api';

export default function TaxPlannerPage() {
  const [estimate, setEstimate] = useState<TaxEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await advancedService.tax();
      setEstimate(result.estimate);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to estimate tax.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="typo-overline text-slate-400">Planning</p>
            <h1 className="text-2xl font-display font-semibold text-slate-100 mt-1">Tax and zakat planner</h1>
            <p className="text-sm text-slate-400 mt-1">Pakistan salaried tax estimate for the current July–June year, plus zakat on cash and savings.</p>
          </div>
          <button type="button" onClick={() => void run()} disabled={loading} className="px-5 py-2.5 rounded-md bg-ink-900 text-white text-sm disabled:opacity-60">
            {loading ? 'Calculating…' : 'Calculate'}
          </button>
        </div>
        {error && <div className="rounded-md border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-500">{error}</div>}
        {estimate && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                <p className="text-xs uppercase text-slate-400">Tax year {estimate.taxYear}</p>
                <p className="text-2xl font-semibold text-slate-100 mt-2">Rs. {estimate.annualTax.toLocaleString()}</p>
                <p className="text-xs text-slate-400 mt-1">{estimate.effectiveRate}% of Rs. {estimate.taxableIncome.toLocaleString()}</p>
              </div>
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                <p className="text-xs uppercase text-slate-400">Monthly set-aside</p>
                <p className="text-2xl font-semibold text-slate-100 mt-2">Rs. {estimate.monthlyWithholding.toLocaleString()}</p>
              </div>
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                <p className="text-xs uppercase text-slate-400">Zakat due</p>
                <p className="text-2xl font-semibold text-emerald-400 mt-2">Rs. {estimate.zakatDue.toLocaleString()}</p>
                <p className="text-xs text-slate-400 mt-1">Base Rs. {estimate.zakatBase.toLocaleString()} · nisab Rs. {estimate.nisab.toLocaleString()}</p>
              </div>
            </div>
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-300 space-y-2">
              {estimate.notes.map((note) => <p key={note}>{note}</p>)}
              <p className="text-xs text-slate-500">{estimate.slabSource}</p>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
