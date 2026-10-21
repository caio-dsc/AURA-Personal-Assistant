import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, Square, AlertCircle, X, Loader2, Globe } from 'lucide-react';
import { AuraState, VoiceInputStatus } from '../types/aura';

interface InputAreaProps {
  onSendMessage: (message: string) => void;
  onToggleListening: () => void;
  onCancelListening: () => void;
  onStopSpeaking: () => void;
  state: AuraState;
  voiceInputStatus: VoiceInputStatus;
  isSpeaking: boolean;
  isRecognitionSupported: boolean;
  interimTranscript?: string;
  errorMessage?: string | null;
  onClearError?: () => void;
  isSearchingWeb?: boolean;
}

export const InputArea: React.FC<InputAreaProps> = ({
  onSendMessage,
  onToggleListening,
  onCancelListening,
  onStopSpeaking,
  state,
  voiceInputStatus,
  isSpeaking,
  isRecognitionSupported,
  interimTranscript = '',
  errorMessage = null,
  onClearError,
  isSearchingWeb = false,
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
  const isListeningOrTranscribing =
    voiceInputStatus === 'listening' || voiceInputStatus === 'transcribing';

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4 sm:pb-6 pt-2">
      {/* Visual Indicator of Speech Recognition States: Ouvindo, Transcrevendo, Enviando */}
      {isListeningOrTranscribing && (
        <div className="flex items-center justify-between gap-2 mb-2 px-3.5 py-2 rounded-xl bg-cyan-950/80 border border-cyan-400/40 text-xs text-cyan-200 backdrop-blur-md shadow-lg shadow-cyan-950/40 animate-in fade-in slide-in-from-bottom-1 duration-200">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
            <span className="font-semibold text-cyan-300 shrink-0">
              {voiceInputStatus === 'transcribing' ? 'Transcrevendo:' : 'Ouvindo sua voz:'}
            </span>
            <span className="text-slate-200 italic truncate font-mono text-[11px] sm:text-xs">
              {interimTranscript || 'Fale agora em português brasileiro...'}
            </span>
          </div>

          {/* Action to Cancel recording */}
          <button
            type="button"
            onClick={onCancelListening}
            className="min-h-[36px] px-2.5 py-1 rounded-lg bg-rose-950/70 hover:bg-rose-900/80 border border-rose-500/40 text-rose-300 text-[11px] font-medium flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
            title="Descartar gravação sem enviar"
            aria-label="Cancelar gravação"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancelar</span>
          </button>
        </div>
      )}

      {/* Sending state from voice */}
      {voiceInputStatus === 'sending' && (
        <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-xl bg-purple-950/70 border border-purple-500/30 text-xs text-purple-200 backdrop-blur-md">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
          <span>Voz reconhecida. Enviando pergunta para a AURA...</span>
        </div>
      )}

      {/* Real-time Web Search Active Notice */}
      {isBusy && isSearchingWeb && (
        <div className="flex items-center gap-2 mb-2 px-3.5 py-2 rounded-xl bg-cyan-950/80 border border-cyan-400/40 text-xs text-cyan-200 backdrop-blur-md shadow-lg shadow-cyan-950/40 animate-pulse">
          <Globe className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />
          <span className="font-semibold text-cyan-300">Pesquisando na web:</span>
          <span className="text-slate-200 truncate">Consultando fontes recentes via Tavily para responder sua pergunta...</span>
        </div>
      )}

      {/* Clear error alert for voice recognition permissions or failures */}
      {errorMessage && (
        <div className="flex items-center justify-between gap-2 mb-2 px-3.5 py-2 rounded-xl bg-rose-950/80 border border-rose-500/40 text-xs text-rose-200 shadow-md">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="truncate flex-1">{errorMessage}</span>
          </div>
          {onClearError && (
            <button
              onClick={onClearError}
              className="p-1 text-rose-400 hover:text-white rounded transition-colors shrink-0"
              aria-label="Fechar aviso de erro"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="relative flex items-end gap-2 p-1.5 sm:p-2 rounded-2xl bg-[#0b1224]/90 border border-slate-800/90 shadow-2xl backdrop-blur-xl focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/30 transition-all"
      >
        {/* Microphone Button (Trigger Speech Recognition) */}
        <button
          type="button"
          onClick={onToggleListening}
          disabled={!isRecognitionSupported || isBusy}
          className={`min-h-[44px] min-w-[44px] p-2.5 rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer ${
            isListeningOrTranscribing
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/50 animate-pulse ring-2 ring-rose-400'
              : isRecognitionSupported
              ? 'text-cyan-400 hover:text-cyan-200 hover:bg-cyan-950/40 active:scale-95'
              : 'text-slate-600 cursor-not-allowed opacity-40'
          }`}
          title={
            !isRecognitionSupported
              ? 'Reconhecimento de voz não suportado neste navegador (digite pelo teclado)'
              : isListeningOrTranscribing
              ? 'Concluir fala e enviar'
              : 'Iniciar reconhecimento de voz (pt-BR)'
          }
          aria-label={
            isListeningOrTranscribing ? 'Parar gravação' : 'Falar pelo microfone'
          }
        >
          {isListeningOrTranscribing ? (
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
            isListeningOrTranscribing
              ? 'Ouvindo... (ou digite aqui)'
              : isBusy && isSearchingWeb
              ? 'AURA está pesquisando na internet via Tavily...'
              : isBusy
              ? 'AURA está pensando...'
              : 'Converse com a AURA... (Pressione Enter para enviar)'
          }
          disabled={isBusy}
          rows={1}
          className="flex-1 max-h-[120px] bg-transparent text-sm sm:text-base text-slate-100 placeholder-slate-500 resize-none py-2.5 px-2 focus:outline-none leading-relaxed disabled:opacity-50"
        />

        {/* Action Buttons: Stop (Speech/Thinking) & Send */}
        <div className="flex items-center gap-1.5 shrink-0 pb-0.5">
          {showStopButton && (
            <button
              type="button"
              onClick={onStopSpeaking}
              className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-rose-950/80 hover:text-rose-300 border border-slate-700/60 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Interromper fala ou cancelar geração"
              aria-label="Interromper fala ou processamento"
            >
              <Square className="w-3.5 h-3.5 fill-current text-rose-400" />
              <span className="hidden sm:inline">Parar</span>
            </button>
          )}

          <button
            type="submit"
            disabled={!text.trim() || isBusy}
            className={`min-h-[44px] min-w-[44px] p-2.5 rounded-xl flex items-center justify-center font-medium transition-all ${
              text.trim() && !isBusy
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-900/30 hover:brightness-110 active:scale-95 cursor-pointer'
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
