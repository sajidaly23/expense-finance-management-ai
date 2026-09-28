'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LandingPage from '../components/landing/LandingPage';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return <LandingPage />;
}
