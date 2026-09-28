'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Wallet,
  Receipt,
  Upload,
  PiggyBank,
  Target,
  Camera,
  Bot,
  Search,
  X,
} from 'lucide-react';

export default function CommandCenter() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const actions = [
    { label: 'Add Income', href: '/income', icon: Wallet, desc: 'Record a new salary or income source' },
    { label: 'Add Expense', href: '/expenses', icon: Receipt, desc: 'Log a new expense item' },
    { label: 'Scan Receipt', href: '/expenses/scan', icon: Camera, desc: 'Scan and extract receipt details using AI OCR' },
    { label: 'Import Excel / CSV', href: '/import', icon: Upload, desc: 'Batch import transactions' },
    { label: 'Create Monthly Budget', href: '/budgets', icon: PiggyBank, desc: 'Set category spending limits' },
    { label: 'Create Savings Goal', href: '/savings-goals', icon: Target, desc: 'Set target amount and target completion date' },
    { label: 'Ask AI Copilot', href: '/assistant', icon: Bot, desc: 'Get immediate AI analysis of your finances' },
  ];

  const filtered = actions.filter((action) =>
    action.label.toLowerCase().includes(query.toLowerCase()) ||
    action.desc.toLowerCase().includes(query.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-start justify-center pt-20 p-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-150">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a quick command or action (e.g., 'Add expense', 'Scan receipt', 'Ask AI')..."
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
            autoFocus
          />
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs text-slate-500 bg-slate-200/60 rounded font-mono">
            ESC
          </kbd>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {filtered.length === 0 ? (
            <p className="p-4 text-xs text-center text-slate-400">No matching quick actions found.</p>
          ) : (
            filtered.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.href + action.label}
                  onClick={() => {
                    setIsOpen(false);
                    router.push(action.href);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-emerald-50/60 hover:border-emerald-100 text-left transition-colors border border-transparent group"
                >
                  <div className="p-2 bg-slate-100 group-hover:bg-emerald-100 text-slate-700 group-hover:text-emerald-700 rounded-xl transition-colors shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-emerald-900">
                      {action.label}
                    </p>
                    <p className="text-xs text-slate-500">{action.desc}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
