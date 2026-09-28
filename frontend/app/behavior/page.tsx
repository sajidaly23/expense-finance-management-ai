'use client';

import { useState } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { advancedService, BehaviorResult } from '../../services/advanced.service';
import { ApiError } from '../../lib/api';

export default function BehaviorPage() {
  const [result, setResult] = useState<BehaviorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setError('');
    setLoading(true);
    try {
      setResult(await advancedService.behavior());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to build a spending profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="typo-overline text-slate-400">Intelligence</p>
            <h1 className="text-2xl font-display font-semibold text-slate-100 mt-1">Spending behavior</h1>
            <p className="text-sm text-slate-400 mt-1">Clusters your months by category mix and suggests one change for the latest pattern.</p>
          </div>
          <button type="button" onClick={() => void run()} disabled={loading} className="px-5 py-2.5 rounded-md bg-ink-900 text-white text-sm disabled:opacity-60">
            {loading ? 'Analyzing…' : 'Analyze'}
          </button>
        </div>
        {error && <div className="rounded-md border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-500">{error}</div>}
        {result && (
          <div className="space-y-4">
            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
              <p className="text-xs uppercase text-slate-400">{result.model}</p>
              <h2 className="text-2xl font-semibold text-slate-100 mt-2">{result.profile}</h2>
              <p className="text-sm text-emerald-400 mt-3">{result.intervention}</p>
              <p className="text-xs text-slate-500 mt-2">
                Want share {Math.round(result.wantShare * 100)}%
                {result.silhouette != null ? ` · silhouette ${result.silhouette}` : ''}
              </p>
            </div>
            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
              {result.months.map((month) => (
                <div key={month.month} className="flex justify-between text-sm py-2 border-b border-slate-800 last:border-0">
                  <span className="text-slate-200">{month.month}</span>
                  <span className="text-slate-400">Cluster {month.cluster} · Rs. {month.total.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
