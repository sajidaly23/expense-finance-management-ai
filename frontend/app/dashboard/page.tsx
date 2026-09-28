'use client';

import { useEffect, useState } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import {
  Wallet,
  CreditCard,
  PiggyBank,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  HeartPulse,
  Plus,
  ShieldAlert,
  ChevronRight,
  Lightbulb,
  AlertTriangle,
  Info,
  Sparkles,
} from 'lucide-react';
import { fetchAIInsights, AIInsightItem } from '../../services/insights.service';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import Link from 'next/link';
import { chartTheme, tooltipStyle } from '../../lib/theme';
import { useAuth } from '../../context/AuthContext';
import { summaryService, SummaryResponse } from '../../services/summary.service';
import { scoreService } from '../../services/score.service';
import { predictionService } from '../../services/prediction.service';
import { anomalyService } from '../../services/anomaly.service';
import { ApiError } from '../../lib/api';
import { AIInsight, Anomaly, FinancialHealthScore, Prediction } from '../../types';
import { recommendationsService } from '../../services/recommendations.service';

import QuickActionModal from '../../components/layout/QuickActionModal';
import { Camera } from 'lucide-react';

const thisMonth = () => new Date().toISOString().slice(0, 7);

export default function DashboardPage() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(thisMonth);
  const [modalAction, setModalAction] = useState<'INCOME' | 'EXPENSE' | 'OCR' | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [score, setScore] = useState<FinancialHealthScore | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [recommendations, setRecommendations] = useState<AIInsight[]>([]);
  const [aiInsights, setAiInsights] = useState<AIInsightItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSidecars = async () => {
    const [scoreResult, predictionResult, anomalyResult, recResult, insightResult] = await Promise.allSettled([
      scoreService.get(),
      predictionService.get(),
      anomalyService.list(),
      recommendationsService.list(),
      fetchAIInsights(),
    ]);
    setScore(scoreResult.status === 'fulfilled' ? scoreResult.value.score : null);
    setPrediction(predictionResult.status === 'fulfilled' ? predictionResult.value.prediction : null);
    setAnomalies(anomalyResult.status === 'fulfilled' ? anomalyResult.value.anomalies : []);
    setRecommendations(recResult.status === 'fulfilled' ? recResult.value.recommendations : []);
    setAiInsights(insightResult.status === 'fulfilled' ? insightResult.value.insights : []);
  };

  const loadSummary = async (monthKey = selectedMonth) => {
    setError('');
    setLoading(true);
    try {
      setSummary(await summaryService.get(6, monthKey));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load dashboard totals.');
    } finally {
      setLoading(false);
    }
  };

  const reloadDashboard = () => {
    loadSummary(selectedMonth);
    loadSidecars();
  };

  useEffect(() => {
    loadSidecars();
  }, []);

  useEffect(() => {
    loadSummary(selectedMonth);
  }, [selectedMonth]);

  const month = summary?.currentMonth;
  const totalIncome = month?.income || 0;
  const totalExpense = month?.expense || 0;
  const totalSavings = month?.savings || 0;
  const savingsRate = month?.savingsRate ?? 0;
  const needsTotal = month?.needsTotal || 0;
  const wantsTotal = month?.wantsTotal || 0;
  const needShare = totalExpense === 0 ? 0 : (needsTotal / totalExpense) * 100;
  const wantShare = totalExpense === 0 ? 0 : (wantsTotal / totalExpense) * 100;
  const pieData = [
    { name: 'Needs', value: needsTotal, color: chartTheme.sage },
    { name: 'Wants', value: wantsTotal, color: chartTheme.copper },
  ].filter((item) => item.value > 0);
  const topCategories = month?.byCategory.slice(0, 3) || [];
  const chartData = summary?.monthly || [];
  const incomeUp = (month?.incomeChangePercent || 0) >= 0;
  const expenseUp = (month?.expenseChangePercent || 0) >= 0;

  return (
    <AppLayout>
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-xl bg-slate-900 border border-slate-800">
          <div className="space-y-1">
            <p className="typo-overline text-slate-400">Overview</p>
            <h1 className="text-2xl md:text-3xl font-display font-semibold text-slate-100">
              Welcome, {user?.name || 'there'}
            </h1>
            <p className="text-slate-400 text-sm">
              {month
                ? `Totals for ${month.label} from your saved income and expenses.`
                : 'Totals come from the income and expense entries on your account.'}
            </p>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <label className="flex items-center gap-2">
              <span className="text-xs text-slate-400 whitespace-nowrap">Month</span>
              <input
                type="month"
                value={selectedMonth}
                max={thisMonth()}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
              />
            </label>
            <button
              type="button"
              onClick={() => setModalAction('INCOME')}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-600/20"
            >
              <Plus className="w-3.5 h-3.5" /> + Add Income
            </button>
            <button
              type="button"
              onClick={() => setModalAction('EXPENSE')}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-rose-600/20"
            >
              <Plus className="w-3.5 h-3.5" /> + Add Expense
            </button>
            <button
              type="button"
              onClick={() => setModalAction('OCR')}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-600/20"
            >
              <Camera className="w-3.5 h-3.5" /> Scan Receipt
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center justify-between gap-3 rounded-md border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-500">
            <span>{error}</span>
            <button type="button" onClick={reloadDashboard} className="font-medium underline-offset-2 hover:underline">
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-400">Loading dashboard…</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">Income · {month?.label}</span>
                  <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
                    <Wallet className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-display font-semibold text-slate-100">
                    Rs. {totalIncome.toLocaleString()}
                  </h3>
                  <p className={`text-xs flex items-center gap-1 font-medium mt-1 ${incomeUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {incomeUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    {Math.abs(month?.incomeChangePercent || 0)}% vs last month
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">Expenses · {month?.label}</span>
                  <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-500 border border-amber-500/20">
                    <CreditCard className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-display font-semibold text-slate-100">
                    Rs. {totalExpense.toLocaleString()}
                  </h3>
                  <p className="text-xs text-amber-500 font-medium mt-1">
                    Need vs Want: {needShare.toFixed(0)}% / {wantShare.toFixed(0)}%
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">Net savings · {month?.label}</span>
                  <div className="p-2.5 bg-teal-500/10 rounded-xl text-teal-400 border border-teal-500/20">
                    <PiggyBank className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-display font-semibold text-slate-100">
                    Rs. {totalSavings.toLocaleString()}
                  </h3>
                  <p className="text-xs text-teal-400 font-medium mt-1">
                    Savings rate: <strong>{savingsRate}%</strong> (target ≥ 20%)
                  </p>
                </div>
              </div>

              <Link href="/financial-health" className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 hover:border-slate-700 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">Financial health</span>
                  <div className="p-2.5 bg-rose-500/10 rounded-xl text-rose-500 border border-rose-500/20">
                    <HeartPulse className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-display font-semibold text-slate-100">{score?.overallScore ?? '—'}</h3>
                    <span className="text-xs text-slate-400">/ 100</span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium mt-1">{score?.status || 'Not scored yet'}</p>
                  <div className="w-full bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-ink-900 h-full rounded-full"
                      style={{ width: `${Math.min(Math.max(score?.overallScore || 0, 0), 100)}%` }}
                    />
                  </div>
                </div>
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                <div>
                  <h3 className="font-bold text-lg text-slate-100 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-400" /> Income and expenses
                  </h3>
                  <p className="text-xs text-slate-400">
                    {chartData.length > 0
                      ? `${chartData[0].month}–${chartData[chartData.length - 1].month} from your ledger`
                      : 'Six months from your ledger'}
                  </p>
                </div>
                <div className="h-72 w-full pt-4">
                  {chartData.every((row) => row.income === 0 && row.expense === 0) ? (
                    <p className="text-sm text-slate-400 pt-16 text-center">
                      Add income or expenses to see the cashflow chart.
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={chartTheme.sage} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={chartTheme.sage} stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={chartTheme.copper} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={chartTheme.copper} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="month" stroke={chartTheme.axis} fontSize={chartTheme.tickFontSize} tickLine={false} />
                        <YAxis
                          stroke={chartTheme.axis}
                          fontSize={chartTheme.tickFontSize}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => (v >= 1000 ? `Rs.${v / 1000}k` : `Rs.${v}`)}
                        />
                        <Tooltip
                          contentStyle={tooltipStyle}
                          formatter={(value: number) => [`Rs. ${Number(value).toLocaleString()}`, '']}
                        />
                        <Area
                          type="monotone"
                          dataKey="income"
                          stroke={chartTheme.sage}
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#incomeGrad)"
                          name="Income"
                        />
                        <Area
                          type="monotone"
                          dataKey="expense"
                          stroke={chartTheme.copper}
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#expenseGrad)"
                          name="Expenses"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <span className="typo-overline text-slate-400">Forecast</span>
                  <div>
                    <p className="text-xs text-slate-400">
                      {prediction ? prediction.predictionPeriod : 'Next-month prediction'}
                    </p>
                    <h2 className="text-xl font-display font-semibold text-slate-100 mt-1">
                      {prediction ? `Rs. ${prediction.predictedAmount.toLocaleString()}` : 'Not trained yet'}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      {prediction
                        ? `${prediction.modelUsed} · ${prediction.changePercentage >= 0 ? '+' : ''}${prediction.changePercentage}% vs last month`
                        : 'Train a model on /predictions after you have at least 3 months of expenses.'}
                    </p>
                  </div>
                </div>
                <Link
                  href="/predictions"
                  className="w-full py-2.5 rounded-md border border-slate-800 hover:bg-slate-950 text-slate-100 font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  Open predictions <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg text-slate-100 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-amber-400" /> Anomaly alerts
                  </h3>
                  <Link href="/anomalies" className="text-xs text-emerald-500 hover:underline">
                    View anomalies
                  </Link>
                </div>
                {anomalies.filter((item) => item.status === 'UNRESOLVED').length === 0 ? (
                  <p className="text-sm text-slate-400">
                    No unresolved unusual expenses. Scan on the anomalies page after you have at least 8 expense entries.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {anomalies
                      .filter((item) => item.status === 'UNRESOLVED')
                      .slice(0, 3)
                      .map((item) => (
                        <p key={item.id} className="text-sm text-slate-300">
                          {item.expenseDescription} · Rs. {item.amount.toLocaleString()} ({item.severity})
                        </p>
                      ))}
                  </div>
                )}
              </div>

              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg text-slate-100 flex items-center gap-2">
                    <PiggyBank className="w-5 h-5 text-teal-400" /> Need vs Want
                  </h3>
                  <Link href="/analytics" className="text-xs text-emerald-500 hover:underline">
                    Open analytics
                  </Link>
                </div>

                {totalExpense === 0 ? (
                  <p className="text-sm text-slate-400">Add an expense to see Need vs Want and top categories.</p>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
                    <div className="w-40 h-40 relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} innerRadius={45} outerRadius={65} paddingAngle={5} dataKey="value">
                            {pieData.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xs text-slate-500">Spent</span>
                        <span className="text-xs font-bold text-slate-200">Rs. {totalExpense.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex-1 space-y-3 w-full">
                      {topCategories.length === 0 ? (
                        <p className="text-sm text-slate-400">No category totals this month.</p>
                      ) : (
                        topCategories.map((item) => {
                          const share = Math.round((item.amount / totalExpense) * 100);
                          return (
                            <div key={item.category} className="space-y-1.5 text-xs">
                              <div className="flex justify-between font-medium">
                                <span className="text-slate-300">{item.category}</span>
                                <span className="text-slate-100">
                                  {share}% (Rs. {item.amount.toLocaleString()})
                                </span>
                              </div>
                              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-ink-900" style={{ width: `${Math.min(share, 100)}%` }} />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-4 mt-2 border-t border-slate-800 space-y-4">
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-400" /> Smart recommendations
                    </h4>
                    {recommendations.length === 0 && aiInsights.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        Add more transactions to unlock personalized recommendations.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {recommendations.slice(0, 2).map((item) => (
                          <div
                            key={item.id}
                            className={`p-3 rounded-lg border text-xs ${
                              item.type === 'warning'
                                ? 'bg-amber-500/5 border-amber-500/20'
                                : item.type === 'positive'
                                  ? 'bg-emerald-500/5 border-emerald-500/20'
                                  : 'bg-slate-950/60 border-slate-800'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              {item.type === 'warning' ? (
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                              ) : (
                                <Info className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                              )}
                              <div>
                                <p className="font-semibold text-slate-100">{item.title}</p>
                                <p className="text-slate-400 mt-0.5 leading-relaxed line-clamp-2">{item.description}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                        {recommendations.length === 0 &&
                          aiInsights.slice(0, 2).map((item) => (
                            <div
                              key={item.id}
                              className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 text-xs space-y-1"
                            >
                              <p className="font-semibold text-slate-100 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                                {item.title}
                              </p>
                              <p className="text-slate-400 leading-relaxed line-clamp-2">{item.description}</p>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  <Link
                    href="/assistant"
                    className="w-full py-2.5 rounded-md border border-slate-800 hover:bg-slate-950 text-slate-100 font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    View full analysis
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}

        {modalAction && (
          <QuickActionModal
            type={modalAction}
            onClose={() => setModalAction(null)}
            onSuccess={() => {
              reloadDashboard();
              setModalAction(null);
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}
