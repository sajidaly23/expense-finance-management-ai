'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

export default function RoleGuard({
  children,
  role = 'ADMIN',
}: {
  children: React.ReactNode;
  role?: 'ADMIN' | 'USER';
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && user.role !== role) {
      router.replace('/dashboard');
    }
  }, [loading, user, role, router]);

  if (loading || !user) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="text-sm text-slate-400">Checking access…</p>
      </div>
    );
  }

  if (user.role !== role) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="text-sm text-slate-400">Redirecting…</p>
      </div>
    );
  }

  return <>{children}</>;
}
