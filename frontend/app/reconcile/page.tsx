'use client';

import { useState } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { advancedService, ReconcileResult } from '../../services/advanced.service';
import { ApiError } from '../../lib/api';

const SAMPLE = `date,description,amount
2026-09-02,Rent,20000
2026-09-05,Utility bill,4500`;

export default function ReconcilePage() {
  const [csv, setCsv] = useState(SAMPLE);
  const [result, setResult] = useState<ReconcileResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const match = async () => {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      setResult(await advancedService.reconcile(csv));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to match this statement.');
    } finally {
      setLoading(false);
    }
  };

  const importMissing = async () => {
    if (!result?.statementOnly.length) return;
    setError('');
    try {
      const imported = await advancedService.importMissing(
        result.statementOnly.map((row) => ({
          ...row,
          description: row.description.length >= 2 ? row.description : 'Statement line',
        }))
      );
      setMessage(imported.message);
      setResult(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to add those expenses.');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div>
            <p className="typo-overline text-slate-400">Accounts</p>
            <h1 className="text-2xl font-display font-semibold text-slate-100 mt-1">Statement reconciliation</h1>
            <p className="text-sm text-slate-400 mt-1">Match a bank CSV to expenses within 3 days and 1% of the amount. Columns: date, description, amount.</p>
          </div>
          <textarea
            value={csv}
            onChange={(event) => setCsv(event.target.value)}
            rows={8}
            className="w-full p-3 rounded-md bg-slate-950 border border-slate-800 text-sm text-slate-100 font-mono"
          />
          <div className="flex flex-wrap gap-3">
            <label className="px-4 py-2 rounded-md border border-slate-700 text-sm text-slate-200 cursor-pointer">
              Choose CSV
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (file) setCsv(await file.text());
                }}
              />
            </label>
            <button type="button" onClick={() => void match()} disabled={loading} className="px-5 py-2 rounded-md bg-ink-900 text-white text-sm disabled:opacity-60">
              {loading ? 'Matching…' : 'Match statement'}
            </button>
          </div>
        </div>
        {error && <div className="rounded-md border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-500">{error}</div>}
        {message && <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">{message}</div>}
        {result && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <List title={`Matched (${result.counts.matched})`} rows={result.matched.map((row) => `${row.statement.date} · Rs. ${row.statement.amount.toLocaleString()} · ${row.expenseDescription}`)} />
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <h2 className="text-sm font-semibold text-slate-100">In the statement only ({result.counts.statementOnly})</h2>
              {result.statementOnly.map((row) => (
                <p key={`${row.date}-${row.amount}-${row.description}`} className="text-xs text-slate-400">{row.date} · Rs. {row.amount.toLocaleString()} · {row.description}</p>
              ))}
              {result.statementOnly.length > 0 && (
                <button type="button" onClick={() => void importMissing()} className="text-sm text-emerald-400 hover:underline">
                  Add these as expenses
                </button>
              )}
            </div>
            <List title={`In SmartFin only (${result.counts.ledgerOnly})`} rows={result.ledgerOnly.map((row) => `${row.date} · Rs. ${row.amount.toLocaleString()} · ${row.description}`)} />
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function List({ title, rows }: { title: string; rows: string[] }) {
  return (
    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
      <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
      {rows.length === 0 ? <p className="text-xs text-slate-500">None</p> : rows.map((row) => <p key={row} className="text-xs text-slate-400">{row}</p>)}
    </div>
  );
}
