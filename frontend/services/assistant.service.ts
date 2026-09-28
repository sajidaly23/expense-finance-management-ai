import { apiRequest } from '../lib/api';

export type AssistantHistoryTurn = {
  role: 'user' | 'assistant';
  text: string;
};

export type AssistantChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  structured?: any;
  source?: string;
  createdAt: string;
};

export type AssistantResponse = {
  status: string;
  answer: string;
  structured?: any;
  source: string;
  usedOllama: boolean;
  messages: AssistantChatMessage[];
};

export type AssistantStatusResponse = {
  status: string;
  ollamaAvailable: boolean;
  model: string;
};

export type AssistantMessagesResponse = {
  status: string;
  messages: AssistantChatMessage[];
  count: number;
};

export const assistantService = {
  status() {
    return apiRequest<AssistantStatusResponse>('/api/assistant/status');
  },
  messages() {
    return apiRequest<AssistantMessagesResponse>('/api/assistant/messages');
  },
  clear() {
    return apiRequest<{ status: string; message: string }>('/api/assistant/messages', {
      method: 'DELETE',
    });
  },
  ask(question: string, useOllama = true, history: AssistantHistoryTurn[] = []) {
    return apiRequest<AssistantResponse>('/api/assistant/ask', {
      method: 'POST',
      body: JSON.stringify({ question, useOllama, history }),
    });
  },
};
