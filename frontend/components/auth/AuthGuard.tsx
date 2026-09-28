'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { RefreshCw } from 'lucide-react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setTimedOut(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
    setTimedOut(false);
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center space-y-4">
        <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Loading workspace…</p>
        {timedOut && (
          <div className="mt-4 p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 max-w-sm space-y-3">
            <p>Connection or script loading took longer than expected.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 mx-auto transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reload Page
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <p className="text-sm text-slate-400">Redirecting to sign in…</p>
      </div>
    );
  }

  return <>{children}</>;
}
