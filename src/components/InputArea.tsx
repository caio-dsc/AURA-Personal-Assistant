import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, Square, AlertCircle } from 'lucide-react';
import { AuraState } from '../types/aura';

interface InputAreaProps {
  onSendMessage: (message: string) => void;
  onToggleListening: () => void;
  onStopSpeaking: () => void;
  state: AuraState;
  isListening: boolean;
  isSpeaking: boolean;
  isRecognitionSupported: boolean;
  interimTranscript?: string;
  errorMessage?: string | null;
}

export const InputArea: React.FC<InputAreaProps> = ({
  onSendMessage,
  onToggleListening,
  onStopSpeaking,
  state,
  isListening,
  isSpeaking,
  isRecognitionSupported,
  interimTranscript = '',
  errorMessage = null,
}) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 120);
      textareaRef.current.style.height = `${Math.max(48, newHeight)}px`;
    }
  }, [text]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || state === 'thinking') return;
    onSendMessage(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '48px';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isBusy = state === 'thinking';
  const showStopButton = isSpeaking || state === 'speaking' || isBusy;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4 sm:pb-6 pt-2">
      {/* Listening or interim transcript indicator */}
      {isListening && (
        <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg bg-cyan-950/70 border border-cyan-500/30 text-xs text-cyan-300 backdrop-blur-md animate-pulse">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="font-medium">Ouvindo sua voz...</span>
          <span className="text-slate-300 italic truncate flex-1">
            {interimTranscript || 'Fale agora'}
          </span>
        </div>
      )}

      {/* Non-intrusive warning if speech recognition is not supported or errored */}
      {errorMessage && (
        <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-500/30 text-xs text-rose-300">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate flex-1">{errorMessage}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="relative flex items-end gap-2 p-1.5 sm:p-2 rounded-2xl bg-[#0b1224]/90 border border-slate-800/90 shadow-2xl backdrop-blur-xl focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/30 transition-all"
      >
        {/* Microphone Button */}
        <button
          type="button"
          onClick={onToggleListening}
          disabled={!isRecognitionSupported || isBusy}
          className={`min-h-[44px] min-w-[44px] p-2.5 rounded-xl flex items-center justify-center transition-all shrink-0 ${
            isListening
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/50 animate-pulse'
              : isRecognitionSupported
              ? 'text-cyan-400 hover:text-cyan-200 hover:bg-cyan-950/40 active:scale-95'
              : 'text-slate-600 cursor-not-allowed opacity-50'
          }`}
          title={
            !isRecognitionSupported
              ? 'Reconhecimento de voz não suportado neste navegador'
              : isListening
              ? 'Parar gravação de voz'
              : 'Iniciar gravação de voz (pt-BR)'
          }
          aria-label={isListening ? 'Parar gravação' : 'Falar pelo microfone'}
        >
          {isListening ? (
            <MicOff className="w-5 h-5 text-white" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </button>

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isListening
              ? 'Ouvindo...'
              : 'Converse com a AURA... (Pressione Enter para enviar)'
          }
          disabled={isBusy}
          rows={1}
          className="flex-1 max-h-[120px] bg-transparent text-sm sm:text-base text-slate-100 placeholder-slate-500 resize-none py-2.5 px-2 focus:outline-none leading-relaxed disabled:opacity-50"
        />

        {/* Action Buttons: Stop Speaking / Submit */}
        <div className="flex items-center gap-1.5 shrink-0 pb-0.5">
          {showStopButton && (
            <button
              type="button"
              onClick={onStopSpeaking}
              className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-rose-950/80 hover:text-rose-300 border border-slate-700/60 text-xs font-medium text-slate-300 flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
              title="Interromper fala ou processamento"
              aria-label="Interromper fala"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">Parar</span>
            </button>
          )}

          <button
            type="submit"
            disabled={!text.trim() || isBusy}
            className={`min-h-[44px] min-w-[44px] p-2.5 rounded-xl flex items-center justify-center font-medium transition-all ${
              text.trim() && !isBusy
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-900/30 hover:brightness-110 active:scale-95'
                : 'text-slate-600 cursor-not-allowed bg-slate-900/40'
            }`}
            title="Enviar mensagem"
            aria-label="Enviar mensagem"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
