import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, AlertCircle, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { assistantApi, ChatMessage } from '@/api/assistant';

export const AIAssistantWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Hello! I am your Brightloop Customer Assistant. I can help explain subscription plans, billing intervals, renewal policies, or guide you around the platform.',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [serviceError, setServiceError] = useState<string | null>(null);

  const { user, isAuthenticated } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputMessage('');
    setIsLoading(true);
    setServiceError(null);

    try {
      const res = await assistantApi.sendMessage({
        message: text,
        context: isAuthenticated && user
          ? {
              customer_id: user.id,
              email: user.email,
              full_name: user.name,
              role: user.role,
            }
          : undefined,
        conversation_history: messages.slice(-6), // last 6 turns context
      });

      if (res.success && res.data?.reply) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: res.data.reply,
          },
        ]);
      } else {
        setServiceError(
          'The Brightloop AI Assistant backend service is currently offline or integration-pending. Inquiries regarding active accounts can be directed through the Customer Services page.'
        );
      }
    } catch {
      setServiceError(
        'Unable to reach AI assistant service. Backend proxy connection is pending deployment.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const samplePrompts = [
    'What billing intervals are supported?',
    'How do pause and renewal policies work?',
    'How are invoice taxes and discounts calculated?',
  ];

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-white shadow-xl hover:bg-blue-700 transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95"
          aria-label="Open AI Assistant"
        >
          <Bot className="w-5 h-5" />
          <span className="text-xs font-bold tracking-tight">Ask Brightloop AI</span>
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        </button>
      )}

      {/* Floating Chat Modal */}
      {isOpen && (
        <div className="flex flex-col w-[360px] sm:w-[420px] h-[520px] rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  Brightloop AI Assistant
                  <span className="text-[10px] font-medium bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded">
                    Advisory
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400">
                  {isAuthenticated ? `Session: ${user?.name || user?.email}` : 'Public Knowledge Base'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close Assistant"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600/30 text-blue-400 border border-blue-500/30 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-xl px-3.5 py-2.5 leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-xs'
                      : 'bg-slate-800/80 text-slate-200 border border-slate-700/60 rounded-bl-xs'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5 justify-start">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600/30 text-blue-400 border border-blue-500/30 mt-0.5">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="rounded-xl px-3.5 py-2.5 bg-slate-800/80 text-slate-400 border border-slate-700/60 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-ping" />
                  <span>Consulting intelligence engine...</span>
                </div>
              </div>
            )}

            {serviceError && (
              <div className="rounded-xl p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{serviceError}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts (if chat is fresh) */}
          {messages.length <= 2 && (
            <div className="px-4 pb-2">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                Suggested Prompts:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {samplePrompts.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(p)}
                    className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700/80 transition-colors text-left cursor-pointer"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Footer */}
          <div className="p-3 bg-slate-950 border-t border-slate-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Ask a question about plans, billing, or policies..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!inputMessage.trim() || isLoading}
                className="shrink-0 px-3"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </form>
            <p className="text-[10px] text-slate-500 text-center mt-2 flex items-center justify-center gap-1">
              <ShieldAlert className="w-3 h-3 text-slate-400" />
              <span>Read-only assistant. Financial modifications require portal confirmation.</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
