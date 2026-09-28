'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BrainCircuit, Mail, ArrowRight } from 'lucide-react';
import { authService } from '../../services/auth.service';
import { ApiError } from '../../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [resetUrl, setResetUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setResetUrl('');
    setSubmitting(true);
    try {
      const res = await authService.forgotPassword({ email: email.trim() });
      setMessage(res.message);
      if (res.resetUrl) setResetUrl(res.resetUrl);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to request a reset. Check that the backend is running.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-[420px] bg-slate-900 border border-slate-800 rounded-xl p-8 space-y-6 shadow-card">
        <div className="space-y-3">
          <div className="w-10 h-10 rounded-md bg-ink-900 text-white flex items-center justify-center">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-semibold text-slate-100">Reset password</h1>
            <p className="text-sm text-slate-400 mt-1">Enter the email on your account</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          {error && (
            <div className="rounded-md border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-rose-500">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-emerald-600 space-y-2">
              <p>{message}</p>
              {resetUrl && (
                <p>
                  Development reset link:{' '}
                  <Link href={resetUrl.replace(/^https?:\/\/[^/]+/, '')} className="font-medium underline">
                    continue
                  </Link>
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-slate-400 mb-1.5 font-medium">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-4 py-2.5 rounded-md bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-ink-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-md bg-ink-900 hover:bg-ink-800 text-white font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
          >
            {submitting ? 'Sending…' : 'Send reset link'} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-sm text-slate-500 pt-2 border-t border-slate-800">
          <Link href="/login" className="text-ink-900 font-medium hover:underline">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
