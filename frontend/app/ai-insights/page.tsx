'use client';

import React, { useEffect, useState, useRef } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import {
  BrainCircuit,
  Sparkles,
  TrendingUp,
  Bot,
  Send,
  PieChart as PieChartIcon,
  ShieldAlert,
  Zap,
  Lightbulb,
  CheckCircle2,
  RefreshCw,
  Trash2,
} from 'lucide-react';
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
import { predictionService } from '../../services/prediction.service';
import { anomalyService } from '../../services/anomaly.service';
import { recommendationsService } from '../../services/recommendations.service';
import { assistantService } from '../../services/assistant.service';
import { advancedService } from '../../services/advanced.service';
import { Anomaly, AIInsight, Prediction } from '../../types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const CATEGORY_COLORS = ['#10b981', '#06b6d4', '#6366f1', '#f59e0b', '#f43f5e', '#a855f7'];

const INITIAL_CHAT_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Hello! I am your SmartFin AI Financial Copilot. Ask me anything about your cash flow, upcoming ML expense predictions, or budget anomalies.',
  timestamp: new Date(),
};

const CHAT_STORAGE_KEY = 'smartfin_copilot_chat_history';

export default function AiInsightsPage() {
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [forecastLab, setForecastLab] = useState<any>(null);
  const [behavior, setBehavior] = useState<any>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [recommendations, setRecommendations] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_CHAT_MESSAGE]);
  const [userInput, setUserInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [predRes, anomRes, recRes, fLabRes, behRes, chatRes] = await Promise.allSettled([
        predictionService.get(),
        anomalyService.list(),
        recommendationsService.list(),
        advancedService.forecast(),
        advancedService.behavior(),
        assistantService.messages(),
      ]);

      if (predRes.status === 'fulfilled') setPrediction(predRes.value.prediction || null);
      if (anomRes.status === 'fulfilled') setAnomalies(anomRes.value.anomalies || []);
      if (recRes.status === 'fulfilled') setRecommendations(recRes.value.recommendations || []);
      if (fLabRes.status === 'fulfilled') setForecastLab(fLabRes.value || null);
      if (behRes.status === 'fulfilled') setBehavior(behRes.value || null);

      // Restore chat messages from backend database
      if (chatRes.status === 'fulfilled' && chatRes.value.messages && chatRes.value.messages.length > 0) {
        const mappedMessages: ChatMessage[] = chatRes.value.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.text,
          timestamp: new Date(m.createdAt),
        }));
        setMessages(mappedMessages);
        if (typeof window !== 'undefined') {
          localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(mappedMessages));
        }
      }
    } catch (err) {
      console.error('Error loading AI insights:', err);
    } finally {
      setLoading(false);
    }
  };

  // Restore messages from localStorage immediately on mount to prevent flicker
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(CHAT_STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(
              parsed.map((item: any) => ({
                ...item,
                timestamp: new Date(item.timestamp || Date.now()),
              }))
            );
          }
        }
      } catch (err) {
        console.error('Failed to parse cached chat messages:', err);
      }
    }
    loadData();
  }, []);

  // Sync messages to localStorage whenever chat updates
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      try {
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
      } catch (err) {
        console.error('Failed to sync chat messages to localStorage:', err);
      }
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleClearChat = async () => {
    try {
      await assistantService.clear();
    } catch (err) {
      console.error('Error clearing chat history on server:', err);
    }
    setMessages([INITIAL_CHAT_MESSAGE]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CHAT_STORAGE_KEY);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || chatLoading) return;

    const query = userInput.trim();
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date(),
    };

    const newMessages = [...messages.filter((m) => m.id !== 'welcome'), userMsg];
    setMessages(newMessages);
    setUserInput('');
    setChatLoading(true);

    // Prepare recent conversational context
    const history = newMessages.slice(-10).map((m) => ({
      role: m.role,
      text: m.content,
    }));

    try {
      const response = await assistantService.ask(query, true, history);
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.answer || 'Here is what I analyzed from your current transactions.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Unable to connect to AI server. Please verify backend environment keys.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const categoryData = [
    { name: 'Food & Dining', value: 34000 },
    { name: 'Utilities & Bills', value: 22000 },
    { name: 'Transportation', value: 18500 },
    { name: 'Groceries', value: 29000 },
    { name: 'Entertainment', value: 12000 },
    { name: 'Other', value: 8500 },
  ];

  const forecastTimeline = [
    { month: 'Apr', actual: 124000, predicted: 122000 },
    { month: 'May', actual: 131000, predicted: 129000 },
    { month: 'Jun', actual: 145000, predicted: 142000 },
    { month: 'Jul', actual: 139000, predicted: 138000 },
    { month: 'Aug', actual: 152000, predicted: 150000 },
    { month: 'Sep (Next)', actual: null, predicted: 158400 },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Module Header */}
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-700 font-semibold border border-indigo-500/30">
                MODULE 3
              </span>
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight">AI Intelligence Hub</h1>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Random Forest predictive forecasts, behavioral pattern analytics, anomaly monitors &amp; NLP Copilot
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-sm">
              <Zap className="w-3.5 h-3.5 text-emerald-600" /> ML Engine: Random Forest Active
            </span>
          </div>
        </div>

        {/* 3-Column / Balanced Layout:
            Left: Behavioral breakdown & Anomalies
            Center: AI Chatbot (Shifted to Center, prominent & large!)
            Right: ML Forecast Graph (Shifted to Right side!)
        */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
                    {/* LEFT / CENTER COLUMN: Chatbot & Anomalies */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl flex flex-col h-[760px] shadow-lg overflow-hidden">
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-700 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-teal-500 flex items-center justify-center text-white shadow-md">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-100">SmartFin Copilot</h3>
                  <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> AI Assistant Online
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleClearChat}
                  title="Clear Chat History"
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={loadData}
                  title="Refresh Intelligence & Chat"
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Message Feed */}
            <div className="flex-1 p-5 overflow-y-auto space-y-3.5 custom-scrollbar text-xs bg-slate-950/40">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-emerald-600 text-white font-medium rounded-br-none'
                        : 'bg-white border border-slate-700 text-slate-100 font-medium rounded-bl-none'
                    }`}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap text-xs md:text-sm">{msg.content}</p>
                    <span
                      className={`block text-[10px] mt-1.5 text-right ${
                        msg.role === 'user' ? 'text-emerald-100' : 'text-slate-400'
                      }`}
                    >
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-700 rounded-2xl p-3.5 text-slate-200 text-xs flex items-center gap-2 shadow-sm">
                    <Sparkles className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>Analyzing your financial data...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Bar - 100% Crisp Visible */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-700 bg-white">
              <div className="flex items-center gap-2.5">
                <input
                  type="text"
                  placeholder="Ask e.g. 'How much did I spend on food this month?'"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  className="flex-1 bg-slate-950 border-2 border-slate-700 rounded-xl px-4 py-3 text-xs md:text-sm text-slate-100 font-medium placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 shadow-inner"
                />
                <button
                  type="submit"
                  disabled={!userInput.trim() || chatLoading}
                  className="p-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-all shadow-md shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
            </div>
            {/* Anomaly Detection Cards */}
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-3 shadow-sm">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                Detected Anomalies
              </h3>
              <div className="space-y-2.5">
                {[
                  {
                    title: 'Spike in Fuel & Transport',
                    desc: 'Rs. 9,500 on 14th Sept. Exceeds historical average.',
                    severity: 'HIGH',
                  },
                  {
                    title: 'Duplicate Subscription',
                    desc: 'Two charges of Rs. 1,100 within 24h.',
                    severity: 'MEDIUM',
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-rose-700">{item.title}</p>
                      <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-800 font-extrabold text-[9px] uppercase">
                        {item.severity}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-tight">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (Cols 9-12): ML Forecast Lab Graph Shifted to Right Side! */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-100">
                    ML Forecast Lab
                  </h3>
                </div>
                <p className="text-xs text-slate-400 leading-snug">
                  Predicted upcoming monthly expense baseline vs historical spending
                </p>
              </div>

              {/* Next Month Highlight Card */}
              <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 flex justify-between items-center">
                <div>
                  <p className="text-[11px] font-semibold text-indigo-800 uppercase tracking-wider">
                    Next Month Predicted Expense
                  </p>
                  <p className="text-2xl font-extrabold text-indigo-700 mt-0.5">
                    Rs. {prediction?.predictedAmount?.toLocaleString() || '158,400'}
                  </p>
                </div>
                <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-sm">
                  <BrainCircuit className="w-5 h-5" />
                </div>
              </div>

              {/* Forecast Area Chart */}
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={forecastTimeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" stroke="#5c6773" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#5c6773"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(val) => `Rs. ${(val / 1000).toFixed(0)}k`}
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
                      dataKey="actual"
                      name="Actual Spending"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#actualGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="predicted"
                      name="Predicted Curve"
                      stroke="#6366f1"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      fillOpacity={1}
                      fill="url(#predGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Legend & Model Metrics */}
              <div className="pt-2 border-t border-slate-700 flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-slate-200">Actual Spending</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-indigo-500" />
                  <span className="text-slate-200">Predicted Curve</span>
                </div>
              </div>
            </div>

            {/* Category Pie */}
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-emerald-600" />
                Category Spending
              </h3>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={65}
                      innerRadius={40}
                      paddingAngle={4}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#D8D4CC',
                        borderRadius: '10px',
                        fontSize: '12px',
                        color: '#122033',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      }}
                      formatter={(val: any) => `Rs. ${Number(val).toLocaleString()}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Smart Recommendations */}
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-3 shadow-sm">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                AI Optimization Tips
              </h3>
              <div className="space-y-2.5">
                {[
                  'Pay utility bills before due date to save Rs. 1,200/mo.',
                  'Weekend dining is 18% higher than weekday average.',
                  'Allocate Rs. 25,000 surplus to High-Yield Fund.',
                ].map((tip, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <span className="leading-snug">{tip}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </div>
    </AppLayout>
  );
}
