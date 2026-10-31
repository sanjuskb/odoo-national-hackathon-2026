import { api } from './client';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantChatPayload {
  message: string;
  context?: {
    customer_id?: string;
    email?: string;
    full_name?: string;
    role?: string;
    session_token?: string;
  };
  conversation_history?: ChatMessage[];
}

export interface AssistantChatResponseData {
  reply: string;
  intent: string;
  grounded: boolean;
  is_simulated: boolean;
  latency_ms: number;
  disclaimer: string;
  metadata?: {
    customer_id?: string;
    active_subscriptions_count?: number;
    invoices_count?: number;
  };
}

export const assistantApi = {
  // POST /api/v1/assistant/chat
  sendMessage: async (payload: AssistantChatPayload) => {
    return api.post<AssistantChatResponseData>('/assistant/chat', payload);
  },
};

