import { config } from '../../config/env.js';

export type StructuredAIResponse = {
  title?: string;
  summary: string;
  evidence?: string[];
  recommendation?: string;
  action?: { label: string; href: string };
  source: string;
};

export type FinancialContextPayload = {
  userName: string;
  monthLabel: string;
  income: number;
  expense: number;
  savings: number;
  savingsRate: number;
  topCategories: { category: string; amount: number }[];
  budgets: { label: string; amount: number; spent: number; utilization: number }[];
  goals: { name: string; target: number; current: number; status: string }[];
  healthScore?: number | null;
  healthStatus?: string | null;
  recurringCommitments?: number;
  netWorth?: number;
  unresolvedAnomaliesCount?: number;
};

export interface IAIProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  generateResponse(
    question: string,
    context: FinancialContextPayload,
    history: { role: 'user' | 'assistant'; text: string }[],
    verifiedAnswer?: string
  ): Promise<StructuredAIResponse | null>;
}

export class FallbackAIProvider implements IAIProvider {
  name = 'SmartFin Assistant';

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async generateResponse(
    question: string,
    context: FinancialContextPayload,
    _history: { role: 'user' | 'assistant'; text: string }[],
    verifiedAnswer?: string
  ): Promise<StructuredAIResponse | null> {
    if (verifiedAnswer && verifiedAnswer.trim()) {
      const lines = verifiedAnswer.split('\n').filter(Boolean);

      return {
        title: 'Financial Insight',
        summary: verifiedAnswer,
        evidence: lines.length > 1 ? lines.slice(1) : [
          `Current Month (${context.monthLabel}): Income Rs. ${context.income.toLocaleString()}, Expense Rs. ${context.expense.toLocaleString()}`,
          `Savings Rate: ${context.savingsRate}%`,
        ],
        recommendation: context.savingsRate < 20 
          ? 'Consider reviewing top discretionary categories to increase your monthly savings rate to at least 20%.'
          : 'Your savings rate is healthy. Keep tracking your goals.',
        source: this.name,
      };
    }

    return {
      title: 'SmartFin Financial Copilot',
      summary:
        `I can answer from your SmartFin records or explain general finance concepts. ` +
        `For personal data, try "How much did I spend last month?" or "Give me a monthly financial summary." ` +
        `For education, try "What is an emergency fund?" or "What is a savings rate?"`,
      evidence: [
        `Your current month (${context.monthLabel}): Income Rs. ${context.income.toLocaleString()}, Expense Rs. ${context.expense.toLocaleString()}`,
        `Net Savings: Rs. ${context.savings.toLocaleString()} (${context.savingsRate}% rate)`,
        `This snapshot is from your personal records — not general financial education.`,
      ],
      recommendation:
        'Ask a specific question about your data, or ask a general "What is…?" finance question.',
      source: this.name,
    };
  }
}

export class OpenAIProvider implements IAIProvider {
  name = 'OpenAI';
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || '';
    this.model = process.env.AI_MODEL || process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async generateResponse(
    question: string,
    context: FinancialContextPayload,
    history: { role: 'user' | 'assistant'; text: string }[],
    verifiedAnswer?: string
  ): Promise<StructuredAIResponse | null> {
    if (!await this.isAvailable()) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);

    const systemPrompt = `You are SmartFin AI Copilot, a senior personal financial advisor.
Return a JSON object ONLY with the following structure:
{
  "title": "Short title",
  "summary": "Direct, accurate 1-2 sentence response to user question",
  "evidence": ["Point 1 with exact numbers", "Point 2"],
  "recommendation": "Actionable financial suggestion",
  "action": {"label": "Button text", "href": "/relevant-route"}
}

CRITICAL RULES:
- Use ONLY the provided financial context and verified figures. NEVER invent numbers or transactions.
- Format all currency amounts as Rs. X,XXX.
- Keep output JSON strictly valid without markdown backticks.`;

    const userPrompt = `Financial Context: ${JSON.stringify(context)}
${verifiedAnswer ? `Verified Calculations: ${verifiedAnswer}\n` : ''}
User Question: ${question}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6).map((turn) => ({
        role: turn.role === 'user' ? ('user' as const) : ('assistant' as const),
        content: turn.text,
      })),
      { role: 'user', content: userPrompt },
    ];

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.2,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      if (!res.ok) return null;
      const data = await res.json() as any;
      const content = data.choices?.[0]?.message?.content;
      if (!content) return null;

      const parsed = JSON.parse(content);
      return {
        title: parsed.title || 'Financial Insight',
        summary: parsed.summary || verifiedAnswer || 'Here is your financial summary.',
        evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
        recommendation: parsed.recommendation || '',
        action: parsed.action,
        source: `AI Copilot (${this.model})`,
      };
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}

export class OllamaProvider implements IAIProvider {
  name = 'Ollama AI';

  async isAvailable(): Promise<boolean> {
    const baseUrl = config.ollamaUrl.replace(/\/$/, '');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    try {
      const response = await fetch(`${baseUrl}/api/tags`, { signal: controller.signal });
      return response.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  async generateResponse(
    question: string,
    context: FinancialContextPayload,
    history: { role: 'user' | 'assistant'; text: string }[],
    verifiedAnswer?: string
  ): Promise<StructuredAIResponse | null> {
    if (!await this.isAvailable()) return null;

    const baseUrl = config.ollamaUrl.replace(/\/$/, '');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);

    const prompt = `You are SmartFin, an AI Personal Finance Copilot.
User Question: "${question}"
${verifiedAnswer ? `Verified Calculations: ${verifiedAnswer}` : ''}
Financial Context JSON: ${JSON.stringify(context)}
Recent History: ${JSON.stringify(history.slice(-4))}

Answer in 2-4 clear sentences using Rs. for currency. Never fabricate figures.`;

    try {
      const response = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: config.ollamaModel,
          prompt,
          stream: false,
        }),
      });

      if (!response.ok) return null;
      const data = (await response.json()) as { response?: string };
      const text = data.response?.trim();
      if (!text) return null;

      return {
        title: 'AI Analysis',
        summary: text,
        evidence: [
          `Current Month: Income Rs. ${context.income.toLocaleString()}, Expense Rs. ${context.expense.toLocaleString()}`,
          `Savings: Rs. ${context.savings.toLocaleString()} (${context.savingsRate}%)`,
        ],
        recommendation: 'Track your spending regularly in Budgets and Savings Goals.',
        source: `Local AI (${config.ollamaModel})`,
      };
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}

export function getAIProvider(): IAIProvider {
  const providerType = (process.env.AI_PROVIDER || '').toLowerCase();
  if (providerType === 'openai' || process.env.AI_API_KEY || process.env.OPENAI_API_KEY) {
    return new OpenAIProvider();
  }
  return new FallbackAIProvider();
}
