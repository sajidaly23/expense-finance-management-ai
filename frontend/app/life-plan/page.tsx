'use client';

import { useState } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { advancedService, LifePlanResult } from '../../services/advanced.service';
import { ApiError } from '../../lib/api';

export default function LifePlanPage() {
  const [years, setYears] = useState(5);
  const [growth, setGrowth] = useState(5);
  const [inflation, setInflation] = useState(8);
  const [plan, setPlan] = useState<LifePlanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await advancedService.lifePlan(years, growth, inflation);
      setPlan(result.plan);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to run the life plan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div>
            <p className="typo-overline text-slate-400">Planning</p>
            <h1 className="text-2xl font-display font-semibold text-slate-100 mt-1">Life plan</h1>
            <p className="text-sm text-slate-400 mt-1">800 simulated paths using your average income, spending, debt payments, and savings goals.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <label className="space-y-1 text-slate-400">Years
              <input type="number" min={1} max={10} value={years} onChange={(event) => setYears(Number(event.target.value))} className="w-full p-2.5 rounded-md bg-slate-950 border border-slate-800 text-slate-100" />
            </label>
            <label className="space-y-1 text-slate-400">Income growth % / year
              <input type="number" min={-20} max={30} value={growth} onChange={(event) => setGrowth(Number(event.target.value))} className="w-full p-2.5 rounded-md bg-slate-950 border border-slate-800 text-slate-100" />
            </label>
            <label className="space-y-1 text-slate-400">Inflation % / year
              <input type="number" min={0} max={25} value={inflation} onChange={(event) => setInflation(Number(event.target.value))} className="w-full p-2.5 rounded-md bg-slate-950 border border-slate-800 text-slate-100" />
            </label>
          </div>
          <button type="button" onClick={() => void run()} disabled={loading} className="px-5 py-2.5 rounded-md bg-ink-900 text-white text-sm disabled:opacity-60">
            {loading ? 'Simulating…' : 'Run paths'}
          </button>
        </div>
        {error && <div className="rounded-md border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-500">{error}</div>}
        {plan && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Stat label="Low path" value={plan.ending.p10} />
              <Stat label="Median net worth" value={plan.ending.p50} />
              <Stat label="High path" value={plan.ending.p90} />
            </div>
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-300">
              Goals are fully funded in {plan.goalReachPercent}% of paths. Starting net worth Rs. {plan.startNetWorth.toLocaleString()}.
            </div>
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
              {plan.yearly.map((row) => (
                <div key={row.year} className="flex justify-between text-sm py-2 border-b border-slate-800 last:border-0">
                  <span className="text-slate-200">Year {row.year}</span>
                  <span className="text-slate-400">Rs. {row.p10.toLocaleString()} – {row.p90.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
      <p className="text-xs uppercase text-slate-400">{label}</p>
      <p className="text-2xl font-semibold text-slate-100 mt-2">Rs. {value.toLocaleString()}</p>
    </div>
  );
}
