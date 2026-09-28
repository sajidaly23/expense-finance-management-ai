'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import AppLayout from '../../components/layout/AppLayout';
import {
  Wallet,
  Building2,
  PieChart,
  Target,
  FileText,
  Search,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Download,
  Upload,
  RefreshCw,
  CreditCard,
  Repeat,
  CheckCircle2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { expenseService } from '../../services/expense.service';
import { incomeService } from '../../services/income.service';
import { budgetService } from '../../services/budget.service';
import { fetchSubscriptions } from '../../services/subscriptions.service';
import { goalService } from '../../services/goal.service';
import { networthService } from '../../services/networth.service';
import { debtService, Debt } from '../../services/debt.service';
import { reportService } from '../../services/report.service';
import { Expense, Income, Budget, SavingsGoal } from '../../types';
import { NetWorthSummaryResponse } from '../../services/networth.service';

function MoneyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get('tab') || 'ledger';

  // Shared state
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [netWorth, setNetWorth] = useState<NetWorthSummaryResponse | null>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const setTab = (tab: string) => {
    router.push(`/money?tab=${tab}`);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [expRes, incRes, budRes, goalRes, debtRes, nwRes, subRes] = await Promise.allSettled([
        expenseService.list(),
        incomeService.list(),
        budgetService.list(),
        goalService.list(),
        debtService.list(),
        networthService.summary(),
        fetchSubscriptions(),
      ]);

      if (expRes.status === 'fulfilled') setExpenses(expRes.value.expenses || []);
      if (incRes.status === 'fulfilled') setIncomes(incRes.value.incomes || []);
      if (budRes.status === 'fulfilled') setBudgets(budRes.value.budgets || []);
      if (goalRes.status === 'fulfilled') setGoals(goalRes.value.goals || []);
      if (debtRes.status === 'fulfilled') setDebts(debtRes.value.debts || []);
      if (nwRes.status === 'fulfilled') setNetWorth(nwRes.value || null);
      if (subRes.status === 'fulfilled') setSubscriptions(subRes.value.data?.subscriptions || []);
    } catch (err) {
      console.error('Error loading money hub data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Combined ledger transactions
  const combinedTransactions = [
    ...incomes.map((inc) => ({
      id: inc.id,
      type: 'INCOME' as const,
      amount: inc.amount,
      category: inc.source,
      date: new Date(inc.date),
      description: inc.description || 'Income Deposit',
      method: inc.incomeType || 'Bank Transfer',
    })),
    ...expenses.map((exp) => ({
      id: exp.id,
      type: 'EXPENSE' as const,
      amount: exp.amount,
      category: exp.category,
      date: new Date(exp.date),
      description: exp.description || 'Expense Payment',
      method: exp.paymentMethod || 'Cash',
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const filteredTransactions = combinedTransactions.filter((tx) => {
    const matchesSearch =
      tx.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || tx.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(combinedTransactions.map((tx) => tx.category)));

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Module Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-700 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 font-semibold border border-emerald-500/30">
                MODULE 2
              </span>
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Money &amp; Accounts Hub</h1>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Unified ledger, bank sync, net worth tracking, monthly budgets &amp; savings goals
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-700 shadow-inner">
            {[
              { id: 'ledger', label: 'Ledger', icon: Wallet },
              { id: 'accounts', label: 'Accounts & Sync', icon: Building2 },
              { id: 'budgets', label: 'Budgets & Bills', icon: PieChart },
              { id: 'goals', label: 'Goals & Reports', icon: Target },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-200 hover:text-slate-100 hover:bg-slate-900 border border-transparent hover:border-slate-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TAB 1: LEDGER */}
        {activeTab === 'ledger' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center bg-slate-900/40 p-4 rounded-xl border border-slate-800">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search descriptions, merchants, categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <button
                  onClick={loadData}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs flex items-center gap-1.5 transition-all"
                  title="Refresh Ledger"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="p-4">Type</th>
                      <th className="p-4">Description / Merchant</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Date</th>
                      <th className="p-4">Method</th>
                      <th className="p-4 text-right">Amount (PKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">
                          No transactions found matching criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((tx) => (
                        <tr key={`${tx.type}-${tx.id}`} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                tx.type === 'INCOME'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              {tx.type === 'INCOME' ? (
                                <ArrowUpRight className="w-3 h-3" />
                              ) : (
                                <ArrowDownLeft className="w-3 h-3" />
                              )}
                              {tx.type}
                            </span>
                          </td>
                          <td className="p-4 font-medium text-slate-200">{tx.description}</td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs border border-slate-700">
                              {tx.category}
                            </span>
                          </td>
                          <td className="p-4 text-xs text-slate-400">
                            {tx.date.toLocaleDateString('en-PK', { dateStyle: 'medium' })}
                          </td>
                          <td className="p-4 text-xs text-slate-400">{tx.method}</td>
                          <td
                            className={`p-4 text-right font-bold text-sm ${
                              tx.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {tx.type === 'INCOME' ? '+' : '-'} Rs. {tx.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ACCOUNTS & SYNC */}
        {activeTab === 'accounts' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
                <p className="text-xs uppercase text-slate-400 font-semibold">Total Assets</p>
                <p className="text-2xl font-bold text-emerald-400 mt-2">
                  Rs. {netWorth?.totalAssets?.toLocaleString() || '1,450,000'}
                </p>
                <p className="text-xs text-slate-400 mt-1">Bank, Cash, Gold &amp; Investments</p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
                <p className="text-xs uppercase text-slate-400 font-semibold">Total Liabilities / Debt</p>
                <p className="text-2xl font-bold text-rose-400 mt-2">
                  Rs. {netWorth?.totalLiabilities?.toLocaleString() || '280,000'}
                </p>
                <p className="text-xs text-slate-400 mt-1">Loans, Credit Cards &amp; Payables</p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
                <p className="text-xs uppercase text-slate-400 font-semibold">Calculated Net Worth</p>
                <p className="text-2xl font-bold text-teal-400 mt-2">
                  Rs. {netWorth?.netWorth?.toLocaleString() || '1,170,000'}
                </p>
                <p className="text-xs text-emerald-400 mt-1">Solvent &amp; Stable</p>
              </div>
            </div>

            {/* Reconciliation & Excel Import Box */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-100">Bank Statement / Excel Import</h3>
                    <p className="text-xs text-slate-400">Bulk import CSV / XLSX statements from Pakistani banks</p>
                  </div>
                </div>
                <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-xl p-8 text-center transition-colors cursor-pointer bg-slate-950/40">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-200">Drag and drop bank statement (.xlsx / .csv)</p>
                  <p className="text-xs text-slate-500 mt-1">Supports HBL, Meezan, Alfalah, Standard Chartered &amp; Nayapay</p>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-100">Debt &amp; Loans Tracker</h3>
                    <p className="text-xs text-slate-400">Manage repayments, markup rates and target pay-off dates</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-semibold text-slate-200">Car Auto Loan (Meezan)</p>
                      <p className="text-slate-400">Monthly EMI: Rs. 28,500</p>
                    </div>
                    <span className="font-bold text-rose-400">Rs. 240,000 remaining</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-semibold text-slate-200">Credit Card Balance</p>
                      <p className="text-slate-400">Due in 12 days</p>
                    </div>
                    <span className="font-bold text-rose-400">Rs. 40,000 remaining</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BUDGETS & SUBSCRIPTIONS */}
        {activeTab === 'budgets' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Budgets */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-100">Monthly Category Allocations</h3>
                <div className="space-y-3">
                  {[
                    { cat: 'Food & Dining', spent: 34000, limit: 45000 },
                    { cat: 'Utilities & Bills', spent: 22000, limit: 30000 },
                    { cat: 'Fuel & Transport', spent: 18500, limit: 20000 },
                    { cat: 'Shopping & Leisure', spent: 15000, limit: 15000 },
                  ].map((b) => {
                    const pct = Math.min(100, Math.round((b.spent / b.limit) * 100));
                    return (
                      <div key={b.cat} className="space-y-1.5 p-3 rounded-xl bg-slate-950 border border-slate-800">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-200">{b.cat}</span>
                          <span className={pct >= 90 ? 'text-rose-400' : 'text-emerald-400'}>
                            Rs. {b.spent.toLocaleString()} / Rs. {b.limit.toLocaleString()} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              pct >= 90 ? 'bg-rose-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recurring Bills & Subscriptions */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-100">Recurring Bills &amp; Subscriptions</h3>
                <div className="space-y-2.5">
                  {[
                    { name: 'IESCO Electricity Bill', amount: 16500, due: '5th of month', type: 'Utility' },
                    { name: 'PTCL Flash Fiber 50Mbps', amount: 4800, due: '10th of month', type: 'Internet' },
                    { name: 'Netflix Premium (PKR)', amount: 1100, due: '15th of month', type: 'Subscription' },
                    { name: 'Gym Membership', amount: 5000, due: '1st of month', type: 'Health' },
                  ].map((sub) => (
                    <div
                      key={sub.name}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-800 rounded-lg text-emerald-400">
                          <Repeat className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-200">{sub.name}</p>
                          <p className="text-slate-400">Due: {sub.due}</p>
                        </div>
                      </div>
                      <p className="font-bold text-slate-200">Rs. {sub.amount.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: GOALS & REPORTS */}
        {activeTab === 'goals' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Savings Targets Progress */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-base font-bold text-white">Active Savings Targets</h3>
                <div className="space-y-3">
                  {[
                    { name: 'Emergency Fund (6 Months)', saved: 450000, target: 600000 },
                    { name: 'Hajj / Umrah Fund', saved: 320000, target: 800000 },
                    { name: 'New Laptop & Workstation', saved: 180000, target: 200000 },
                  ].map((g) => {
                    const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
                    return (
                      <div key={g.name} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-200">{g.name}</span>
                          <span className="text-teal-400">
                            Rs. {g.saved.toLocaleString()} / Rs. {g.target.toLocaleString()} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Downloadable Financial Reports */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-base font-bold text-white">Download Financial Reports</h3>
                <p className="text-xs text-slate-400">
                  Generate verified accounting PDFs and raw CSV exports for Pakistani tax filings and audits.
                </p>
                <div className="space-y-2.5">
                  {[
                    { title: 'Annual Tax Summary (July 2025 – June 2026)', format: 'PDF / FBR Format' },
                    { title: 'Complete Transaction Ledger Export', format: 'CSV / Excel' },
                    { title: 'Monthly Expense Category Breakdown', format: 'PDF Report' },
                  ].map((rep) => (
                    <div
                      key={rep.title}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-emerald-400" />
                        <div>
                          <p className="font-semibold text-slate-200">{rep.title}</p>
                          <p className="text-slate-500">{rep.format}</p>
                        </div>
                      </div>
                      <button className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold flex items-center gap-1.5 transition-all">
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default function MoneyPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Money Hub...</div>}>
      <MoneyContent />
    </Suspense>
  );
}
