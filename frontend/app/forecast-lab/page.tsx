'use client';

import { useState } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { advancedService, ForecastLabResult } from '../../services/advanced.service';
import { ApiError } from '../../lib/api';

export default function ForecastLabPage() {
  const [result, setResult] = useState<ForecastLabResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setError('');
    setLoading(true);
    try {
      setResult(await advancedService.forecast());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to run the interval forecast.');
    } finally {
      setLoading(false);
    }
  };

  const max = Math.max(1, ...(result?.bands.map((band) => band.p90) || [1]));

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="typo-overline text-slate-400">Intelligence</p>
            <h1 className="text-2xl font-display font-semibold text-slate-100 mt-1">Forecast lab</h1>
            <p className="text-sm text-slate-400 mt-1">Six-month spending range from a linear trend and 400 residual bootstrap draws. The ML service must be running.</p>
          </div>
          <button type="button" onClick={() => void run()} disabled={loading} className="px-5 py-2.5 rounded-md bg-ink-900 text-white text-sm disabled:opacity-60">
            {loading ? 'Running…' : 'Run forecast'}
          </button>
        </div>
        {error && <div className="rounded-md border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-500">{error}</div>}
        {result && (
          <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <p className="text-sm text-slate-300">{result.model} · {result.monthsUsed} months · fit {result.r2}</p>
            <div className="space-y-3">
              {result.bands.map((band) => (
                <div key={band.month}>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>{band.month}</span>
                    <span>Rs. {band.p10.toLocaleString()} – {band.p90.toLocaleString()}</span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-800 relative overflow-hidden">
                    <div
                      className="absolute h-full bg-emerald-500/40"
                      style={{ left: `${(band.p10 / max) * 100}%`, width: `${Math.max(2, ((band.p90 - band.p10) / max) * 100)}%` }}
                    />
                    <div className="absolute h-full w-1 bg-emerald-300" style={{ left: `${(band.p50 / max) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500">The bar is the 10th to 90th percentile. The mark is the median.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
