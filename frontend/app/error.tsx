'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4 text-center">
        <h2 className="text-lg font-semibold text-slate-100">Something went wrong</h2>
        <p className="text-sm text-slate-400">
          The page failed to load. This often clears after a refresh or dev server restart.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2 rounded-md bg-ink-900 hover:bg-ink-800 text-white text-sm font-medium"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-md border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-800"
          >
            Reload page
          </button>
        </div>
      </div>
    </div>
  );
}
