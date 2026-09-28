'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BrainCircuit, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const { completeReset } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!token) {
      setError('This reset link is missing a token. Request a new one.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await completeReset(token, password, confirmPassword);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[420px] bg-slate-900 border border-slate-800 rounded-xl p-8 space-y-6 shadow-card">
      <div className="space-y-3">
        <div className="w-10 h-10 rounded-md bg-ink-900 text-white flex items-center justify-center">
          <BrainCircuit className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-semibold text-slate-100">Set a new password</h1>
          <p className="text-sm text-slate-400 mt-1">Choose a password with at least 6 characters</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        {error && (
          <div className="rounded-md border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-rose-500">
            {error}
          </div>
        )}

        <div>
          <label className="block text-slate-400 mb-1.5 font-medium">New password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-md bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-ink-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-400 mb-1.5 font-medium">Confirm password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-md bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-ink-400"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded-md bg-ink-900 hover:bg-ink-800 text-white font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
        >
          {submitting ? 'Updating…' : 'Update password'} <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="text-center text-sm text-slate-500 pt-2 border-t border-slate-800">
        <Link href="/forgot-password" className="text-ink-900 font-medium hover:underline">Request a new link</Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <Suspense fallback={<p className="text-sm text-slate-400">Loading…</p>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
