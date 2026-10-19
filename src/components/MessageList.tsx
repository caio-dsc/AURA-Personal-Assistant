import React, { useEffect, useRef } from 'react';
import { Sparkles, Terminal, Cpu, Network } from 'lucide-react';
import { ChatMessage } from '../types/aura';
import { MessageBubble } from './MessageBubble';

interface MessageListProps {
  messages: ChatMessage[];
  onSelectPrompt: (prompt: string) => void;
  onSpeakMessage?: (text: string) => void;
  isSpeaking?: boolean;
  isKeyConfigured?: boolean | null;
  onOpenArchitecture?: () => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  onSelectPrompt,
  onSpeakMessage,
  isKeyConfigured = null,
  onOpenArchitecture,
}) => {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const quickPrompts = [
    {
      icon: Cpu,
      title: 'Computação Quântica',
      prompt: 'Pesquise os últimos avanços em computação quântica e correção de erros.',
    },
    {
      icon: Terminal,
      title: 'Função Retry TypeScript',
      prompt: 'Escreva uma função TypeScript para retry exponencial com jitter.',
    },
    {
      icon: Network,
      title: 'Arquitetura OpenRouter',
      prompt: 'Explique como a AURA deve ser conectada de forma segura ao OpenRouter via Node.js.',
    },
    {
      icon: Sparkles,
      title: 'Capacidades da AURA',
      prompt: 'Quais são as suas capacidades atuais no frontend e futuras com OpenRouter?',
    },
  ];

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4 shadow-lg shadow-cyan-950/50">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-2">
          Olá, eu sou a AURA
        </h2>
        <p className="text-sm text-slate-400 mb-8 max-w-md leading-relaxed">
          Sua assistente pessoal com reconhecimento e síntese de voz em português brasileiro, preparada para conexão futura com OpenRouter.
        </p>

        {/* Quick Suggestion Chips */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {quickPrompts.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={() => onSelectPrompt(item.prompt)}
                className="flex items-center gap-3 p-3.5 rounded-xl bg-[#0b1222]/80 border border-slate-800 hover:border-cyan-500/40 hover:bg-[#0f172a] text-left transition-all duration-200 group active:scale-[0.99]"
              >
                <div className="p-2 rounded-lg bg-cyan-950/50 text-cyan-400 group-hover:bg-cyan-500/20 transition-colors shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-slate-200 group-hover:text-cyan-300">
                    {item.title}
                  </span>
                  <span className="block text-[11px] text-slate-400 truncate">
                    {item.prompt}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 md:px-8 space-y-1">
      {/* Real backend status notice */}
      <div className="flex items-center justify-center mb-4">
        {isKeyConfigured === false ? (
          <button
            onClick={onOpenArchitecture}
            className="px-3.5 py-1 rounded-full bg-rose-950/70 border border-rose-500/40 text-[11px] text-rose-300 backdrop-blur-md hover:bg-rose-900/60 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Clique para ver instruções de configuração do .env"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>OPENROUTER_API_KEY pendente no .env do servidor &middot; Ver instruções</span>
          </button>
        ) : (
          <div className="px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] text-cyan-300/80 backdrop-blur-md flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>Servidor AURA &middot; OpenRouter (openrouter/free)</span>
          </div>
        )}
      </div>

      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          onSpeak={onSpeakMessage}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};
