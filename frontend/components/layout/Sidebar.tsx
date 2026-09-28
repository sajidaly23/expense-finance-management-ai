'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  TrendingUp, 
  BrainCircuit, 
  AlertTriangle, 
  HeartPulse, 
  Wallet, 
  Receipt, 
  PiggyBank, 
  Target, 
  Bot, 
  FileText, 
  UserCheck, 
  ShieldCheck,
  LogOut,
  Upload,
  Repeat,
  Bell,
  Lightbulb,
  CreditCard,
  Scale,
} from 'lucide-react';
import { getInitials, useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const mainNav = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, desc: 'Overview & metrics' },
    { name: 'Money & Accounts', href: '/money', icon: Wallet, desc: 'Ledger, budgets & sync' },
    { name: 'AI Intelligence Hub', href: '/ai-insights', icon: BrainCircuit, desc: 'Forecast lab & AI bot' },
    { name: 'Compliance & Life Plan', href: '/compliance', icon: Scale, desc: 'FBR tax, Zakat & simulation' },
  ];

  const renderNavGroup = (title: string, items: { name: string; href: string; icon: typeof LayoutDashboard; desc: string }[]) => (
    <div className="space-y-1.5 py-2">
      <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
        {title}
      </p>
      {items.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setIsOpen(false)}
            className={`group flex items-start gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isActive
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-ink-300 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${isActive ? 'text-emerald-400' : 'text-ink-400 group-hover:text-ink-100'}`} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm leading-tight text-white">{item.name}</p>
              <p className="text-[11px] text-ink-400 mt-0.5 truncate">{item.desc}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );

  return (
    <>
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)} 
          className="fixed inset-0 z-40 bg-ink-950/50 lg:hidden"
        />
      )}

      <aside className={`fixed top-0 left-0 z-50 h-screen w-64 bg-ink-900 text-ink-100 border-r border-ink-800 flex flex-col justify-between transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-5 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          <Link href="/dashboard" className="flex items-center gap-3 px-1">
            <div className="w-9 h-9 rounded-md bg-white text-ink-900 flex items-center justify-center">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-white leading-none">SmartFin</p>
              <p className="text-xs text-ink-400 mt-0.5">Wealth &amp; Planning</p>
            </div>
          </Link>

          <hr className="border-ink-800" />

          <nav className="space-y-4">
            {renderNavGroup('Core Modules', mainNav)}

            {user?.role === 'ADMIN' && (
              <div className="pt-2 border-t border-ink-800">
                <Link
                  href="/admin"
                  onClick={() => setIsOpen(false)}
                  className={`group flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    pathname.startsWith('/admin')
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>System Administration</span>
                </Link>
              </div>
            )}
          </nav>
        </div>

        <div className="p-4 border-t border-ink-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center font-semibold text-xs shrink-0">
                {getInitials(user?.name)}
              </div>
              <div className="text-left min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.name || 'Account'}</p>
                <p className="text-xs text-ink-400 truncate">{user?.email || 'Personal account'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                logout();
                router.replace('/login');
              }}
              className="p-2 text-ink-400 hover:text-white transition-colors"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
