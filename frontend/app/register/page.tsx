'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BrainCircuit, Lock, Mail, User, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading: authLoading, register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/dashboard');
    }
  }, [authLoading, user, router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(name.trim(), email.trim(), password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create account. Check that the backend is running.');
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
            <h1 className="text-2xl font-display font-semibold text-slate-100">Create an account</h1>
            <p className="text-sm text-slate-400 mt-1">Start tracking income, expenses, and forecasts</p>
          </div>
        </div>

        <form onSubmit={handleRegister} className="space-y-4 text-sm">
          {error && (
            <div className="rounded-md border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-rose-500">
              {error}
            </div>
          )}

          <div>
            <label className="block text-slate-400 mb-1.5 font-medium">Full name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                required
                minLength={2}
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Mercer"
                className="w-full pl-9 pr-4 py-2.5 rounded-md bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-ink-400"
              />
            </div>
          </div>

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

          <div>
            <label className="block text-slate-400 mb-1.5 font-medium">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full pl-9 pr-4 py-2.5 rounded-md bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-ink-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-md bg-ink-900 hover:bg-ink-800 text-white font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
          >
            {submitting ? 'Creating account…' : 'Create account'} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-sm text-slate-500 pt-2 border-t border-slate-800">
          Already registered? <Link href="/login" className="text-ink-900 font-medium hover:underline">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
