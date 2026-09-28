'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import {
  Bot,
  Send,
  Trash2,
  ArrowRight,
  Sparkles,
  TrendingUp,
  ChevronRight,
  CheckCircle2,
  Lightbulb,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { getInitials, useAuth } from '../../context/AuthContext';
import {
  assistantService,
  AssistantChatMessage,
  AssistantHistoryTurn,
} from '../../services/assistant.service';
import { summaryService } from '../../services/summary.service';
import { ApiError } from '../../lib/api';
import Link from 'next/link';

interface StructuredAIResponse {
  title?: string;
  summary: string;
  evidence?: string[];
  recommendation?: string;
  action?: { label: string; href: string };
  source?: string;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  structured?: StructuredAIResponse;
  timestamp: string;
  source?: string;
}

function nowStamp() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatStamp(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function welcomeMessage(firstName: string): Message {
  return {
    id: 'welcome',
    sender: 'assistant',
    text: `Hello ${firstName}! I am your AI Financial Copilot. I analyze your actual financial records in real time.`,
    structured: {
      title: '✨ Welcome to AI Financial Copilot',
      summary: `Hello ${firstName}! I am connected directly to your live ledger. Ask me any question about your spending, income, budgets, goals, recurring subscriptions, or forecasts.`,
      evidence: [
        'Live financial data context layer active',
        'Deterministic calculations for financial accuracy',
        'Zero hallucinated figures — grounded strictly in your records',
      ],
      recommendation: 'Select any quick prompt below or type your question to analyze your finances.',
    },
    timestamp: nowStamp(),
    source: 'SmartFin Assistant',
  };
}

function toUiMessage(item: AssistantChatMessage): Message {
  return {
    id: item.id,
    sender: item.role,
    text: item.text,
    structured: item.structured,
    timestamp: formatStamp(item.createdAt),
    source: item.source,
  };
}

export default function AIAssistantPage() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] || 'there';
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('smartfin_assistant_messages');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {
        console.error('Failed to load cached assistant messages:', e);
      }
    }
    return [];
  });
  const [input, setInput] = useState('');
  const [useOllama, setUseOllama] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [liveContext, setLiveContext] = useState<any>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      setLoadingHistory(true);
      try {
        const [statusResult, historyResult, summaryData] = await Promise.all([
          assistantService.status().catch(() => ({ ollamaAvailable: false })),
          assistantService.messages().catch(() => ({ messages: [] })),
          summaryService.get(6).catch(() => null),
        ]);
        if (cancelled) return;

        setUseOllama(statusResult.ollamaAvailable);
        setLiveContext(summaryData?.currentMonth || null);
        const resolved =
          historyResult.messages.length > 0
            ? historyResult.messages.map(toUiMessage)
            : [welcomeMessage(firstName)];
        setMessages(resolved);
        if (typeof window !== 'undefined') {
          localStorage.setItem('smartfin_assistant_messages', JSON.stringify(resolved));
        }
      } catch {
        if (cancelled) return;
        setMessages((prev) => (prev.length > 0 ? prev : [welcomeMessage(firstName)]));
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    };

    void boot();
    return () => {
      cancelled = true;
    };
  }, [firstName]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      try {
        localStorage.setItem('smartfin_assistant_messages', JSON.stringify(messages));
      } catch (e) {
        console.error('Failed to sync assistant messages to localStorage:', e);
      }
    }
  }, [messages]);

  const quickQuestions = [
    'Give me a monthly financial summary',
    'Why did my savings decrease?',
    'Where am I spending the most?',
    'How much did I spend on food this month?',
    'Compare this month with last month',
    'How much can I save every month?',
    'Help me create a budget',
    'How long will it take me to reach my savings goal?',
    'What are my biggest unnecessary expenses?',
    'Find unusual spending',
    'Show my recurring subscriptions',
    'What happens if my income increases by 20%?',
    'Can I afford a laptop for Rs. 150,000?',
    'What happens if I save Rs. 15,000 every month?',
    'What happens if my rent increases?',
    'How much should I save for an emergency fund?',
    'What changed in my finances this month?',
  ];

  const handleClear = async () => {
    if (clearing || sending) return;
    setClearing(true);
    try {
      await assistantService.clear();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('smartfin_assistant_messages');
      }
      setMessages([welcomeMessage(firstName)]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          sender: 'assistant',
          text: err instanceof ApiError ? err.message : 'Unable to clear chat right now.',
          timestamp: nowStamp(),
          source: 'Error',
        },
      ]);
    } finally {
      setClearing(false);
    }
  };

  const handleSend = async (questionText?: string) => {
    const question = (questionText || input).trim();
    if (!question || sending || loadingHistory) return;

    const history: AssistantHistoryTurn[] = messages
      .filter((item) => item.id !== 'welcome' && item.source !== 'Error')
      .slice(-10)
      .map((item) => ({
        role: item.sender,
        text: item.text,
      }));

    const tempUserId = `temp_u_${Date.now()}`;
    const userMsg: Message = {
      id: tempUserId,
      sender: 'user',
      text: question,
      timestamp: nowStamp(),
    };

    setMessages((prev) => [...prev.filter((item) => item.id !== 'welcome'), userMsg]);
    if (!questionText) setInput('');
    setSending(true);

    try {
      const result = await assistantService.ask(question, useOllama, history);
      setMessages((prev) => [
        ...prev.filter((item) => item.id !== tempUserId),
        ...result.messages.map(toUiMessage),
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          sender: 'assistant',
          text: err instanceof ApiError ? err.message : 'Unable to answer right now. Check that the backend is running.',
          timestamp: nowStamp(),
          source: 'Error',
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-[#e6e2da] shadow-card">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-[#1f6b56]/10 text-[#1f6b56] rounded-xl border border-[#1f6b56]/20">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-[#122033]">AI Financial Copilot</h1>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-[#1f6b56]/10 text-[#1f6b56] px-2.5 py-0.5 rounded-full border border-[#1f6b56]/20">
                  <ShieldCheck className="w-3 h-3" /> Grounded in Live Data
                </span>
              </div>
              <p className="text-xs text-[#6B7580] mt-0.5">
                Deterministic accuracy · Real-time financial context · Zero hallucinated numbers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => void handleClear()}
              disabled={clearing || sending || loadingHistory}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Chat
            </button>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Chat Column */}
          <div className="lg:col-span-3 space-y-4 flex flex-col h-[calc(100vh-16rem)] min-h-[520px]">
            {/* Quick Prompt Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0 custom-scrollbar">
              {quickQuestions.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={sending || loadingHistory}
                  onClick={() => void handleSend(q)}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#122033] text-[#122033] hover:text-white text-xs font-medium border border-[#e6e2da] shadow-2xs whitespace-nowrap transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3 text-[#1f6b56] shrink-0" />
                  <span>{q}</span>
                </button>
              ))}
            </div>

            {/* Messages Scroll View */}
            <div
              ref={chatRef}
              className="flex-1 p-6 rounded-2xl bg-[#faf8f5] border border-[#e6e2da] overflow-y-auto space-y-4 custom-scrollbar"
            >
              {loadingHistory ? (
                <div className="space-y-4">
                  <div className="h-16 bg-white animate-pulse rounded-2xl w-3/4 border border-[#e6e2da]" />
                  <div className="h-16 bg-[#122033]/10 animate-pulse rounded-2xl w-2/3 ml-auto" />
                </div>
              ) : (
                messages.map((message) => {
                  const isUser = message.sender === 'user';
                  const struct = message.structured;

                  return (
                    <div
                      key={message.id}
                      className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isUser && (
                        <div className="p-2 bg-[#1f6b56] text-white rounded-xl shadow-xs shrink-0 mt-1">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}

                      <div
                        className={`max-w-2xl p-5 rounded-2xl text-xs space-y-3 shadow-card ${
                          isUser
                            ? 'bg-[#122033] text-white font-medium rounded-tr-xs'
                            : 'bg-white border border-[#e6e2da] text-[#122033] rounded-tl-xs'
                        }`}
                      >
                        {struct && !isUser ? (
                          <div className="space-y-3 text-xs">
                            {struct.title && (
                              <div className="flex items-center gap-2 pb-2 border-b border-[#e6e2da]">
                                <Sparkles className="w-4 h-4 text-[#1f6b56]" />
                                <h4 className="font-bold text-[#122033] text-sm">{struct.title}</h4>
                              </div>
                            )}

                            <p className="leading-relaxed text-[#243044] font-medium text-xs">
                              {struct.summary || message.text}
                            </p>

                            {struct.evidence && struct.evidence.length > 0 && (
                              <div className="p-3 rounded-xl bg-[#f5f3ef] border border-[#e6e2da] space-y-1.5">
                                <p className="text-[10px] font-bold text-[#6B7580] uppercase tracking-wider">
                                  Evidence &amp; Observations
                                </p>
                                <ul className="space-y-1 text-xs text-[#243044]">
                                  {struct.evidence.map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                      <span className="text-[#1f6b56] font-bold">•</span>
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {struct.recommendation && (
                              <div className="p-3 rounded-xl bg-[#1f6b56]/10 border border-[#1f6b56]/20 text-[#0e322a] space-y-1">
                                <p className="font-bold text-[#185544] flex items-center gap-1.5">
                                  <Lightbulb className="w-3.5 h-3.5" /> Recommendation
                                </p>
                                <p className="text-xs leading-relaxed">{struct.recommendation}</p>
                              </div>
                            )}

                            {struct.action && (
                              <Link
                                href={struct.action.href}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1f6b56] hover:text-[#185544] hover:underline pt-1"
                              >
                                {struct.action.label} <ArrowRight className="w-3.5 h-3.5" />
                              </Link>
                            )}
                          </div>
                        ) : (
                          <p className="leading-relaxed whitespace-pre-wrap">{message.text}</p>
                        )}

                        <div
                          className={`flex items-center justify-between text-[11px] pt-1.5 border-t ${
                            isUser ? 'border-white/10 text-slate-300' : 'border-[#e6e2da]/50 text-[#6B7580]'
                          }`}
                        >
                          <span>{message.timestamp}</span>
                          {message.source && !isUser && (
                            <span className="font-semibold text-[#1f6b56] bg-[#1f6b56]/10 px-2 py-0.5 rounded-full border border-[#1f6b56]/20">
                              {message.source}
                            </span>
                          )}
                        </div>
                      </div>

                      {isUser && (
                        <div className="w-8 h-8 rounded-xl bg-[#1f6b56] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-1 shadow-xs">
                          {getInitials(user?.name)}
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {sending && (
                <div className="flex items-center gap-2.5 text-[#6B7580] text-xs p-3.5 bg-white rounded-xl border border-[#e6e2da] shadow-xs w-fit animate-pulse">
                  <Bot className="w-4 h-4 text-[#1f6b56]" />
                  <span className="font-medium text-[#122033]">Analyzing financial records &amp; running calculations…</span>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                void handleSend();
              }}
              className="flex items-center gap-3 shrink-0"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your income, expenses, budgets, savings goals, or forecasts..."
                disabled={loadingHistory}
                className="flex-1 px-4 py-3.5 rounded-xl bg-white border border-[#e6e2da] text-xs text-[#122033] placeholder:text-[#6B7580] shadow-xs focus:outline-none focus:border-[#1f6b56] focus:ring-1 focus:ring-[#1f6b56] disabled:opacity-50 font-medium"
              />
              <button
                type="submit"
                disabled={sending || loadingHistory || !input.trim()}
                className="px-5 py-3.5 rounded-xl bg-[#122033] hover:bg-[#1A2433] text-white font-semibold text-xs shadow-card transition-all flex items-center gap-2 disabled:opacity-50 shrink-0"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* Context Right Sidebar */}
          <div className="space-y-4">
            {/* Live Ledger Card */}
            <div className="p-5 rounded-2xl bg-white border border-[#e6e2da] shadow-card space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#e6e2da]">
                <h3 className="text-xs font-bold text-[#122033] flex items-center gap-2 uppercase tracking-wider">
                  <TrendingUp className="w-4 h-4 text-[#1f6b56]" />
                  Live Ledger
                </h3>
                <span className="text-[11px] bg-[#1f6b56]/10 text-[#1f6b56] px-2.5 py-0.5 rounded-full font-semibold border border-[#1f6b56]/20">
                  {liveContext?.label || 'Active'}
                </span>
              </div>

              {liveContext ? (
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between p-3 rounded-xl bg-[#f7f6f3]">
                    <span className="text-[#6B7580]">Income</span>
                    <span className="font-bold text-[#122033]">Rs. {liveContext.income?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-xl bg-[#f7f6f3]">
                    <span className="text-[#6B7580]">Expenses</span>
                    <span className="font-bold text-[#122033]">Rs. {liveContext.expense?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-xl bg-[#1f6b56]/10 text-[#0e322a] border border-[#1f6b56]/20">
                    <span className="font-medium">Net Savings</span>
                    <span className="font-bold">Rs. {liveContext.savings?.toLocaleString()} ({liveContext.savingsRate}%)</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#6B7580]">Loading ledger data…</p>
              )}
            </div>

            {/* Quick Intelligence Links */}
            <div className="p-5 rounded-2xl bg-white border border-[#e6e2da] shadow-card space-y-3">
              <h4 className="text-xs font-bold text-[#122033] uppercase tracking-wider">Financial Tools</h4>
              <div className="space-y-1.5 text-xs font-medium">
                <Link
                  href="/anomalies"
                  className="flex items-center justify-between p-3 rounded-xl text-[#243044] hover:bg-[#f7f6f3] transition-colors group border border-transparent hover:border-[#e6e2da]"
                >
                  <span>Unusual Spending</span>
                  <ChevronRight className="w-4 h-4 text-[#6B7580] group-hover:text-[#122033]" />
                </Link>
                <Link
                  href="/recurring"
                  className="flex items-center justify-between p-3 rounded-xl text-[#243044] hover:bg-[#f7f6f3] transition-colors group border border-transparent hover:border-[#e6e2da]"
                >
                  <span>Subscriptions &amp; Bills</span>
                  <ChevronRight className="w-4 h-4 text-[#6B7580] group-hover:text-[#122033]" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
