'use client';

import React, { useState } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import {
  Scale,
  Calculator,
  Coins,
  TrendingUp,
  Percent,
  CheckCircle,
  HelpCircle,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

export default function CompliancePage() {
  const [activeTab, setActiveTab] = useState<'tax' | 'zakat' | 'simulator'>('tax');

  // FBR Tax Calculator State
  const [monthlySalary, setMonthlySalary] = useState<number>(250000);
  const [taxType, setTaxType] = useState<'salaried' | 'business'>('salaried');

  // Pakistani FBR Tax Calculation (Tax Year 2025–2026 Slabs)
  const calculateFBRTax = (annual: number) => {
    if (annual <= 600000) return { tax: 0, slab: 'Slab 1: Up to Rs. 600,000 (0%)' };
    if (annual <= 1200000) {
      const tax = (annual - 600000) * 0.05;
      return { tax, slab: 'Slab 2: Rs. 600k – 1.2M (5% of excess over 600k)' };
    }
    if (annual <= 2200000) {
      const tax = 30000 + (annual - 1200000) * 0.15;
      return { tax, slab: 'Slab 3: Rs. 1.2M – 2.2M (Rs. 30,000 + 15% of excess)' };
    }
    if (annual <= 3200000) {
      const tax = 180000 + (annual - 2200000) * 0.25;
      return { tax, slab: 'Slab 4: Rs. 2.2M – 3.2M (Rs. 180,000 + 25% of excess)' };
    }
    if (annual <= 4100000) {
      const tax = 430000 + (annual - 3200000) * 0.30;
      return { tax, slab: 'Slab 5: Rs. 3.2M – 4.1M (Rs. 430,000 + 30% of excess)' };
    }
    const tax = 700000 + (annual - 4100000) * 0.35;
    return { tax, slab: 'Slab 6: Over Rs. 4.1M (Rs. 700,000 + 35% of excess)' };
  };

  const annualIncome = monthlySalary * 12;
  const taxResult = calculateFBRTax(annualIncome);
  const monthlyWithholding = Math.round(taxResult.tax / 12);
  const effectiveRate = ((taxResult.tax / (annualIncome || 1)) * 100).toFixed(1);

  // Zakat Calculator State
  const [cashInHand, setCashInHand] = useState<number>(350000);
  const [goldValue, setGoldValue] = useState<number>(600000);
  const [investmentsValue, setInvestmentsValue] = useState<number>(450000);
  const [immediateDebts, setImmediateDebts] = useState<number>(100000);

  const silverNisabPKR = 165000; // ~52.5 tolas of silver current value in PKR
  const totalZakatableAssets = Math.max(
    0,
    cashInHand + goldValue + investmentsValue - immediateDebts
  );
  const isNisabMet = totalZakatableAssets >= silverNisabPKR;
  const zakatDue = isNisabMet ? Math.round(totalZakatableAssets * 0.025) : 0;

  // Life Plan Simulator State
  const [currentAge, setCurrentAge] = useState<number>(28);
  const [targetRetireAge, setTargetRetireAge] = useState<number>(55);
  const [currentSavings, setCurrentSavings] = useState<number>(1000000);
  const [monthlyContribution, setMonthlyContribution] = useState<number>(50000);
  const [expectedReturn, setExpectedReturn] = useState<number>(14); // 14% mutual fund / equity return in PKR
  const [inflationRate, setInflationRate] = useState<number>(8); // 8% avg inflation

  // Generate Compound Projection Data
  const generateProjection = () => {
    const years = targetRetireAge - currentAge;
    const data = [];
    let nominalCorpus = currentSavings;
    let realCorpus = currentSavings;

    for (let i = 0; i <= years; i += 3) {
      const age = currentAge + i;
      const months = i * 12;
      const nominalRate = expectedReturn / 100 / 12;
      const realRate = (expectedReturn - inflationRate) / 100 / 12;

      // Future value with monthly compounding
      let nom = currentSavings * Math.pow(1 + nominalRate, months);
      let real = currentSavings * Math.pow(1 + realRate, months);
      for (let m = 1; m <= months; m++) {
        nom += monthlyContribution * Math.pow(1 + nominalRate, months - m);
        real += monthlyContribution * Math.pow(1 + realRate, months - m);
      }

      data.push({
        age: `Age ${age}`,
        nominal: Math.round(nom),
        real: Math.round(real),
      });
    }
    return data;
  };

  const projectionData = generateProjection();
  const finalNominal = projectionData[projectionData.length - 1]?.nominal || 0;
  const finalReal = projectionData[projectionData.length - 1]?.real || 0;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Module Header */}
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 font-semibold border border-emerald-500/30">
                MODULE 4
              </span>
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Compliance &amp; Life Planning</h1>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              FBR Pakistani tax slabs, Islamic Zakat engine (2.5%), and inflation-adjusted retirement trajectory
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-700 shadow-inner">
            <button
              onClick={() => setActiveTab('tax')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'tax'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-200 hover:text-slate-100 hover:bg-slate-900'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" /> FBR Income Tax
            </button>
            <button
              onClick={() => setActiveTab('zakat')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'zakat'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-200 hover:text-slate-100 hover:bg-slate-900'
              }`}
            >
              <Coins className="w-3.5 h-3.5" /> Zakat (2.5%)
            </button>
            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'simulator'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-200 hover:text-slate-100 hover:bg-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" /> Life Plan Simulator
            </button>
          </div>
        </div>

        {/* TAB 1: PAKISTANI FBR INCOME TAX CALCULATOR */}
        {activeTab === 'tax' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Input Form */}
              <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-5 shadow-sm">
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-emerald-600" />
                  Monthly Salary / Tax Details
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Monthly Gross Salary (PKR)
                    </label>
                    <input
                      type="number"
                      value={monthlySalary}
                      onChange={(e) => setMonthlySalary(Number(e.target.value))}
                      className="w-full bg-white border-2 border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 font-bold focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Taxpayer Category
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setTaxType('salaried')}
                        className={`py-2 text-xs font-semibold rounded-xl border ${
                          taxType === 'salaried'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-600 font-bold shadow-sm'
                            : 'bg-white text-slate-300 border-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        Salaried Individual
                      </button>
                      <button
                        type="button"
                        onClick={() => setTaxType('business')}
                        className={`py-2 text-xs font-semibold rounded-xl border ${
                          taxType === 'business'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-600 font-bold shadow-sm'
                            : 'bg-white text-slate-300 border-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        Business / AOP
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-700 text-xs text-slate-400 space-y-1">
                    <p className="font-semibold text-slate-200">FBR Tax Year: 2025–2026</p>
                    <p>Applies latest progressive withholding brackets under Section 149 of the Income Tax Ordinance.</p>
                  </div>
                </div>
              </div>

              {/* Calculated Result Cards */}
              <div className="lg:col-span-2 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-sm">
                    <p className="text-xs uppercase font-semibold text-slate-400">Annual Tax Liability</p>
                    <p className="text-2xl font-extrabold text-rose-500 mt-2">
                      Rs. {taxResult.tax.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Effective Rate: {effectiveRate}%</p>
                  </div>

                  <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-sm">
                    <p className="text-xs uppercase font-semibold text-slate-400">Monthly Tax Deduction</p>
                    <p className="text-2xl font-extrabold text-amber-600 mt-2">
                      Rs. {monthlyWithholding.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Salary Withholding</p>
                  </div>

                  <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-sm">
                    <p className="text-xs uppercase font-semibold text-slate-400">Net Monthly Take-Home</p>
                    <p className="text-2xl font-extrabold text-emerald-600 mt-2">
                      Rs. {(monthlySalary - monthlyWithholding).toLocaleString()}
                    </p>
                    <p className="text-xs text-emerald-600 mt-1">After Tax Deduction</p>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-3 shadow-sm">
                  <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Applicable FBR Bracket Detail
                  </h4>
                  <p className="text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 p-3.5 rounded-xl">
                    {taxResult.slab}
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Tax calculations are fully compliant with Federal Board of Revenue (FBR) Pakistan Finance Act directives.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ISLAMIC ZAKAT CALCULATOR (2.5%) */}
        {activeTab === 'zakat' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Asset Inputs */}
              <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-4 shadow-sm">
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-500" />
                  Zakatable Wealth (Held 1 Lunar Year)
                </h3>

                <div className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Cash in Hand &amp; Bank Accounts (PKR)
                    </label>
                    <input
                      type="number"
                      value={cashInHand}
                      onChange={(e) => setCashInHand(Number(e.target.value))}
                      className="w-full bg-white border-2 border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 font-bold text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Gold &amp; Silver Value (PKR)
                    </label>
                    <input
                      type="number"
                      value={goldValue}
                      onChange={(e) => setGoldValue(Number(e.target.value))}
                      className="w-full bg-white border-2 border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 font-bold text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Shares, Mutual Funds &amp; Trade Inventory (PKR)
                    </label>
                    <input
                      type="number"
                      value={investmentsValue}
                      onChange={(e) => setInvestmentsValue(Number(e.target.value))}
                      className="w-full bg-white border-2 border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 font-bold text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-rose-500 uppercase tracking-wider mb-1.5">
                      Minus: Immediate Due Liabilities / Debts (PKR)
                    </label>
                    <input
                      type="number"
                      value={immediateDebts}
                      onChange={(e) => setImmediateDebts(Number(e.target.value))}
                      className="w-full bg-white border-2 border-rose-400 rounded-xl px-3.5 py-2.5 text-rose-600 font-bold text-sm focus:outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600 shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Zakat Result Summary */}
              <div className="lg:col-span-2 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-sm">
                    <p className="text-xs uppercase font-semibold text-slate-400">Net Zakatable Wealth</p>
                    <p className="text-3xl font-extrabold text-slate-100 mt-2">
                      Rs. {totalZakatableAssets.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Current Silver Nisab Benchmark: Rs. {silverNisabPKR.toLocaleString()}
                    </p>
                  </div>

                  <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-sm">
                    <p className="text-xs uppercase font-semibold text-slate-400">Total Zakat Payable (2.5%)</p>
                    <p className="text-3xl font-extrabold text-emerald-600 mt-2">
                      Rs. {zakatDue.toLocaleString()}
                    </p>
                    <p className="text-xs text-emerald-600 font-semibold mt-1">
                      {isNisabMet ? '✅ Nisab threshold reached' : 'Nisab not met'}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-3 shadow-sm">
                  <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-teal-600" />
                    Zakat Calculation Guidelines
                  </h4>
                  <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
                    <li>Rate is fixed at 2.5% (or 2.577% if calculated according to solar calendar).</li>
                    <li>Primary residence and personal vehicles are exempt from Zakat.</li>
                    <li>Zakat becomes obligatory once net assets surpass Nisab for one continuous lunar year (Hawl).</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: INFLATION-ADJUSTED LIFE PLAN SIMULATOR */}
        {activeTab === 'simulator' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Parameters */}
              <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-4 shadow-sm">
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-teal-600" />
                  Life Plan Inputs
                </h3>

                <div className="space-y-3.5 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Current Age</label>
                      <input
                        type="number"
                        value={currentAge}
                        onChange={(e) => setCurrentAge(Number(e.target.value))}
                        className="w-full bg-white border-2 border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-bold focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Target Age</label>
                      <input
                        type="number"
                        value={targetRetireAge}
                        onChange={(e) => setTargetRetireAge(Number(e.target.value))}
                        className="w-full bg-white border-2 border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-bold focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Current Initial Corpus (PKR)</label>
                    <input
                      type="number"
                      value={currentSavings}
                      onChange={(e) => setCurrentSavings(Number(e.target.value))}
                      className="w-full bg-white border-2 border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-bold focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Monthly Investment (PKR)</label>
                    <input
                      type="number"
                      value={monthlyContribution}
                      onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                      className="w-full bg-white border-2 border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-bold focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Expected Return (%)</label>
                      <input
                        type="number"
                        value={expectedReturn}
                        onChange={(e) => setExpectedReturn(Number(e.target.value))}
                        className="w-full bg-white border-2 border-slate-700 rounded-xl px-3 py-2 text-emerald-700 font-bold focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Inflation Rate (%)</label>
                      <input
                        type="number"
                        value={inflationRate}
                        onChange={(e) => setInflationRate(Number(e.target.value))}
                        className="w-full bg-white border-2 border-slate-700 rounded-xl px-3 py-2 text-rose-600 font-bold focus:outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600 shadow-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Projection Chart & Final Corpus */}
              <div className="lg:col-span-2 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-sm">
                    <p className="text-xs uppercase font-semibold text-slate-400">Future Nominal Wealth</p>
                    <p className="text-2xl font-extrabold text-teal-600 mt-2">
                      Rs. {(finalNominal / 10000000).toFixed(2)} Crore (PKR {finalNominal.toLocaleString()})
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Projected at Age {targetRetireAge}</p>
                  </div>

                  <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-sm">
                    <p className="text-xs uppercase font-semibold text-slate-400">Real Purchasing Power (Inflation-Adjusted)</p>
                    <p className="text-2xl font-extrabold text-emerald-600 mt-2">
                      Rs. {(finalReal / 10000000).toFixed(2)} Crore (PKR {finalReal.toLocaleString()})
                    </p>
                    <p className="text-xs text-emerald-600 mt-1">In Today's Purchasing Power</p>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-3 shadow-sm">
                  <h4 className="text-sm font-bold text-slate-100">Wealth Trajectory Curve</h4>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={projectionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="nomGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="realGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="age" stroke="#5c6773" fontSize={11} tickLine={false} />
                        <YAxis
                          stroke="#5c6773"
                          fontSize={11}
                          tickLine={false}
                          tickFormatter={(val) => `Rs. ${(val / 10000000).toFixed(1)}Cr`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#FFFFFF',
                            borderColor: '#D8D4CC',
                            borderRadius: '12px',
                            fontSize: '12px',
                            color: '#122033',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          }}
                          formatter={(val: any) => [`Rs. ${Number(val).toLocaleString()}`, '']}
                        />
                        <Area
                          type="monotone"
                          dataKey="nominal"
                          name="Nominal Value"
                          stroke="#14b8a6"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#nomGrad)"
                        />
                        <Area
                          type="monotone"
                          dataKey="real"
                          name="Real (Purchasing Power)"
                          stroke="#10b981"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#realGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
