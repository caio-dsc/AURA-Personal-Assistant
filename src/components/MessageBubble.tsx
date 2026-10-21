import React, { useState } from 'react';
import { Check, Copy, ExternalLink, Volume2, Globe } from 'lucide-react';
import { ChatMessage } from '../types/aura';

interface MessageBubbleProps {
  message: ChatMessage;
  onSpeak?: (text: string) => void;
  isSpeakingThis?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onSpeak,
  isSpeakingThis = false,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const isUser = message.role === 'user';

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  // Helper to parse content into text and code blocks
  const renderFormattedContent = (content: string) => {
    const codeBlockRegex = /```([a-zA-Z0-9_\-+]*)\n([\s\S]*?)```/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let blockIndex = 0;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const textBefore = content.substring(lastIndex, match.index);
      if (textBefore) {
        parts.push(renderTextWithFormatting(textBefore, `text-${lastIndex}`));
      }

      const language = match[1] || 'plaintext';
      const code = match[2].trim();
      const currentBlockIndex = blockIndex++;

      parts.push(
        <div
          key={`code-${currentBlockIndex}`}
          className="my-3 rounded-xl overflow-hidden border border-slate-700/60 bg-[#070b16] shadow-lg"
        >
          {/* Code Header Bar */}
          <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#0b1224] border-b border-slate-800 text-xs text-slate-400">
            <span className="font-mono text-[11px] font-medium tracking-wide uppercase text-cyan-400">
              {language}
            </span>
            <button
              onClick={() => copyToClipboard(code, currentBlockIndex)}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Copiar código"
            >
              {copiedIndex === currentBlockIndex ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar código</span>
                </>
              )}
            </button>
          </div>

          {/* Code Body */}
          <pre className="p-3.5 overflow-x-auto text-[13px] leading-relaxed text-slate-200 font-mono">
            <code>{code}</code>
          </pre>
        </div>
      );

      lastIndex = match.index + match[0].length;
    }

    const textRemaining = content.substring(lastIndex);
    if (textRemaining) {
      parts.push(renderTextWithFormatting(textRemaining, `text-${lastIndex}`));
    }

    return parts;
  };

  // Helper to format basic bold and linebreaks
  const renderTextWithFormatting = (text: string, keyPrefix: string) => {
    const paragraphs = text.split('\n\n');
    return (
      <div key={keyPrefix} className="space-y-2">
        {paragraphs.map((p, pIdx) => {
          // Process markdown bold **text**
          const parts = p.split(/(\*\*[^*]+\*\*)/g);
          return (
            <p key={`${keyPrefix}-p-${pIdx}`} className="leading-relaxed">
              {parts.map((part, idx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return (
                    <strong key={idx} className="font-semibold text-white">
                      {part.slice(2, -2)}
                    </strong>
                  );
                }
                return part;
              })}
            </p>
          );
        })}
      </div>
    );
  };

  const formattedTime = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(message.timestamp));

  return (
    <div
      className={`flex flex-col w-full my-3 transition-opacity duration-300 ${
        isUser ? 'items-end' : 'items-start'
      }`}
    >
      <div
        className={`max-w-[92%] sm:max-w-[85%] md:max-w-[78%] rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 text-[14px] md:text-[15px] ${
          isUser
            ? 'bg-gradient-to-r from-cyan-600/90 to-blue-600/90 text-white shadow-md shadow-cyan-950/40 rounded-br-xs'
            : message.isError
            ? 'bg-[#180914]/90 border border-rose-800/70 text-rose-200 shadow-md shadow-rose-950/30 rounded-bl-xs backdrop-blur-md'
            : 'bg-[#0b1222]/90 border border-slate-800/80 text-slate-200 shadow-md shadow-black/40 rounded-bl-xs backdrop-blur-md'
        }`}
      >
        {/* Author & Status bar for Assistant */}
        {!isUser && (
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/60 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className={`font-semibold tracking-wide ${message.isError ? 'text-rose-400' : 'text-cyan-400'}`}>
                AURA
              </span>
              {message.isError ? (
                <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/50">
                  Aviso
                </span>
              ) : (
                <>
                  {message.searchedWeb && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 flex items-center gap-1 font-medium">
                      <Globe className="w-2.5 h-2.5" />
                      <span>Web</span>
                    </span>
                  )}
                  {message.model && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800/80 text-cyan-300/80 border border-slate-700/50">
                      {message.model}
                    </span>
                  )}
                </>
              )}
            </div>

            {onSpeak && (
              <button
                onClick={() => onSpeak(message.content)}
                className={`p-1 rounded hover:bg-slate-800 transition-colors ${
                  isSpeakingThis ? 'text-cyan-400 animate-pulse' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Ouvir resposta com voz sintetizada"
                aria-label="Ouvir resposta"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Message Body */}
        <div className="break-words">{renderFormattedContent(message.content)}</div>

        {/* Research Sources & Citations Area */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
              <div className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span>Fontes e Referências de Pesquisa</span>
                <span className="text-slate-500">({message.sources.length})</span>
              </div>
              {message.searchQuery && (
                <span
                  className="text-[10px] text-cyan-400/80 font-mono truncate max-w-[200px]"
                  title={`Consulta pesquisada: "${message.searchQuery}"`}
                >
                  &ldquo;{message.searchQuery}&rdquo;
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {message.sources.map((source, sIdx) => (
                <a
                  key={sIdx}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#070b16]/70 border border-slate-800/80 hover:border-cyan-500/40 hover:bg-[#0b1429] transition-all group"
                  title={`Abrir fonte: ${source.title}`}
                >
                  <ExternalLink className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-200 truncate group-hover:text-cyan-300">
                      {source.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {source.domain && (
                        <p className="text-[11px] text-cyan-400 font-mono truncate">{source.domain}</p>
                      )}
                    </div>
                    {source.snippet && (
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {source.snippet}
                      </p>
                    )}
                    <span className="text-[10px] text-slate-500 font-mono truncate block mt-1 group-hover:text-slate-400">
                      {source.url}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Informa quando pesquisa web foi realizada mas não retornou fontes externas utilizáveis */}
        {message.searchedWeb && (!message.sources || message.sources.length === 0) && (
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center gap-2 text-xs text-slate-400">
            <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>
              Pesquisa web realizada{message.searchQuery ? ` para "${message.searchQuery}"` : ''}: nenhuma fonte externa utilizável localizada.
            </span>
          </div>
        )}

        {/* Timestamp */}
        <div
          className={`flex items-center gap-1 mt-2 text-[10px] ${
            isUser ? 'justify-end text-cyan-200/80' : 'justify-end text-slate-500'
          }`}
        >
          <span>{formattedTime}</span>
        </div>
      </div>
    </div>
  );
};
