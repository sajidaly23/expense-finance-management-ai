'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import AuthGuard from '../auth/AuthGuard';
import CommandCenter from '../CommandCenter';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
          <Header setSidebarOpen={setSidebarOpen} />
          <main className="flex-1 p-4 md:p-8 overflow-y-auto">
            {children}
          </main>
        </div>
        <CommandCenter />
      </div>
    </AuthGuard>
  );
}
