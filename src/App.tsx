/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Globe } from 'lucide-react';
import { AuraState, ChatMessage, Conversation } from './types/aura';
import { auraService, INITIAL_CONVERSATIONS } from './services/auraService';
import { shouldSearchWeb } from './server/searchService';
import { useAuraVoice } from './hooks/useAuraVoice';
import { usePWAInstall } from './hooks/usePWAInstall';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { AuraCore } from './components/AuraCore';
import { MessageList } from './components/MessageList';
import { InputArea } from './components/InputArea';
import { VoiceSettingsModal } from './components/VoiceSettingsModal';
import { ArchitectureModal } from './components/ArchitectureModal';

export default function App() {
  // Conversational state
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aura_conversations');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // fallback
        }
      }
    }
    return INITIAL_CONVERSATIONS;
  });

  const [activeConversationId, setActiveConversationId] = useState<string>(() => {
    return conversations[0]?.id || 'conv-1';
  });

  // Visual state of the AI Core
  const [auraState, setAuraState] = useState<AuraState>('idle');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isSearchingWeb, setIsSearchingWeb] = useState(false);

  // UI Modals & Drawers
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isVoiceSettingsOpen, setIsVoiceSettingsOpen] = useState(false);
  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false);
  const [showIOSInstallGuide, setShowIOSInstallGuide] = useState(false);

  // Backend connection status
  const [isKeyConfigured, setIsKeyConfigured] = useState<boolean | null>(null);

  // PWA Install hook
  const { isInstallable, isIOS, install } = usePWAInstall();

  // Request abort controller ref
  const currentAbortRef = useRef<AbortController | null>(null);

  // Unified Voice Interaction Hook (STT & TTS)
  const {
    voiceInputStatus,
    isListening,
    isSpeaking,
    interimTranscript,
    voiceError,
    audioLevel,
    voiceSettings,
    setVoiceSettings,
    toggleAutoSpeak,
    isRecognitionSupported,
    toggleListening,
    cancelListening,
    speak,
    stopSpeaking,
  } = useAuraVoice({
    onSendMessage: (text) => handleSendMessage(text),
    isBusy: auraState === 'thinking',
  });

  // Verifica status do backend OpenRouter na inicialização
  useEffect(() => {
    auraService.checkBackendStatus().then((status) => {
      setIsKeyConfigured(status.isKeyConfigured);
    });
  }, []);

  // Save conversations to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('aura_conversations', JSON.stringify(conversations));
    } catch {
      // storage quota or private browsing
    }
  }, [conversations]);

  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) ||
    conversations[0] || {
      id: 'default',
      title: 'Nova Conversa',
      updatedAt: new Date(),
      messages: [],
    };

  // Create new conversation
  const handleNewConversation = () => {
    const newConv: Conversation = {
      id: `conv-${Date.now()}`,
      title: 'Nova Conversa',
      updatedAt: new Date(),
      messages: [],
    };
    setConversations([newConv, ...conversations]);
    setActiveConversationId(newConv.id);
    stopSpeaking();
    cancelListening();
    setIsSearchingWeb(false);
    setAuraState('idle');
  };

  // Delete conversation
  const handleDeleteConversation = (id: string) => {
    const filtered = conversations.filter((c) => c.id !== id);
    setConversations(filtered);
    if (activeConversationId === id) {
      if (filtered.length > 0) {
        setActiveConversationId(filtered[0].id);
      } else {
        handleNewConversation();
      }
    }
  };

  // Interrupt Speech, active thinking or active recording
  const handleStopAll = () => {
    if (currentAbortRef.current) {
      currentAbortRef.current.abort();
      currentAbortRef.current = null;
    }
    stopSpeaking();
    cancelListening();
    setIsSearchingWeb(false);
    setAuraState('idle');
  };

  // Submit User Message
  const handleSendMessage = async (text: string) => {
    const trimmed = text.trim();
    // Impeça envios duplicados durante uma requisição em andamento
    if (!trimmed || auraState === 'thinking') return;

    // Interrupt any ongoing speech
    stopSpeaking();
    setSpeechError(null);

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    // Update conversation title if it's the first message
    const isFirst = activeConversation.messages.length === 0;
    const updatedTitle = isFirst
      ? trimmed.slice(0, 32) + (trimmed.length > 32 ? '...' : '')
      : activeConversation.title;

    const updatedMessages = [...activeConversation.messages, userMessage];

    // Exiba a mensagem do usuário imediatamente
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? { ...c, title: updatedTitle, updatedAt: new Date(), messages: updatedMessages }
          : c
      )
    );

    // Determina se a pergunta atual requer pesquisa em tempo real na web
    const searchDecision = shouldSearchWeb(trimmed);
    setIsSearchingWeb(searchDecision.requiresSearch);

    // Mostre o estado Pensando enquanto a requisição estiver em andamento
    setAuraState('thinking');

    const controller = new AbortController();
    currentAbortRef.current = controller;

    try {
      // Chamada real ao endpoint /api/chat conectado ao OpenRouter
      const response = await auraService.sendMessage(trimmed, updatedMessages, controller.signal);
      currentAbortRef.current = null;
      setIsSearchingWeb(false);

      // Exiba a resposta real da IA quando ela chegar
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        sources: response.sources,
        searchedWeb: response.searchedWeb,
        searchQuery: response.searchQuery,
        isSimulated: false,
        model: response.model,
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id
            ? { ...c, updatedAt: new Date(), messages: [...c.messages, assistantMessage] }
            : c
        )
      );

      setIsKeyConfigured(true);

      // Leitura por voz automática se habilitada nas configurações
      if (voiceSettings.autoSpeak) {
        speak(response.content, assistantMessage.id);
      } else {
        setAuraState('idle');
      }
    } catch (err: unknown) {
      currentAbortRef.current = null;
      setIsSearchingWeb(false);
      const errorMsg = err instanceof Error ? err.message : 'Falha ao processar solicitação.';

      // Se a geração foi cancelada pelo usuário, apenas retorne ao repouso
      if (errorMsg.includes('cancelada')) {
        setAuraState('idle');
        return;
      }

      setAuraState('error');
      setSpeechError(errorMsg);

      // Adiciona o erro real como mensagem explicativa para o usuário
      const errorMessage: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        role: 'assistant',
        content: errorMsg,
        timestamp: new Date(),
        isError: true,
        isSimulated: false,
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id
            ? { ...c, updatedAt: new Date(), messages: [...c.messages, errorMessage] }
            : c
        )
      );

      setTimeout(() => {
        setAuraState('idle');
      }, 3500);
    }
  };

  // Clicking the AI Sphere directly
  const handleCoreClick = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else if (isListening) {
      cancelListening();
    } else if (auraState === 'thinking') {
      handleStopAll();
    } else if (isRecognitionSupported) {
      toggleListening();
    }
  };

  // State preview selector (to inspect visual states manually)
  const handleSetStatePreview = (previewState: AuraState) => {
    if (previewState === 'speaking' && !isSpeaking) {
      speak('Testando a voz da assistente AURA em português brasileiro.');
    } else if (previewState === 'listening' && !isListening) {
      toggleListening();
    } else {
      handleStopAll();
      setAuraState(previewState);
    }
  };

  // Active state of the Sphere Core
  const activeCoreState: AuraState =
    auraState === 'error'
      ? 'error'
      : auraState === 'thinking'
      ? 'thinking'
      : isSpeaking
      ? 'speaking'
      : isListening
      ? 'listening'
      : 'idle';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#05070f] text-slate-100 aura-ambient-bg font-sans">
      {/* Responsive Sidebar for History & Settings */}
      <Sidebar
        conversations={conversations}
        activeId={activeConversationId}
        onSelectConversation={setActiveConversationId}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        onOpenVoiceSettings={() => setIsVoiceSettingsOpen(true)}
        onOpenArchitecture={() => setIsArchitectureOpen(true)}
        onInstallPWA={isIOS ? () => setShowIOSInstallGuide(true) : install}
        isPWAInstallable={isInstallable || isIOS}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Center Stage */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Bar with Brand, State Selector, Actions */}
        <TopBar
          onToggleMobileMenu={() => setIsMobileMenuOpen(true)}
          currentState={activeCoreState}
          onSetStatePreview={handleSetStatePreview}
          onOpenVoiceSettings={() => setIsVoiceSettingsOpen(true)}
          onOpenArchitecture={() => setIsArchitectureOpen(true)}
          onInstallPWA={isIOS ? () => setShowIOSInstallGuide(true) : install}
          isPWAInstallable={isInstallable || isIOS}
          autoSpeak={voiceSettings.autoSpeak}
          onToggleAutoSpeak={toggleAutoSpeak}
        />

        {/* Content Container: AI Core + Messages Feed */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Luminous AI Core Sphere */}
          <section className="shrink-0 pt-3 pb-2 flex flex-col items-center justify-center">
            <AuraCore
              state={activeCoreState}
              audioLevel={audioLevel}
              size={activeConversation.messages.length === 0 ? 250 : 170}
              onClick={handleCoreClick}
              className="transition-all duration-500 ease-out"
            />
          </section>

          {/* Conversation Messages */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <MessageList
              messages={activeConversation.messages}
              onSelectPrompt={handleSendMessage}
              onSpeakMessage={(text) => speak(text)}
              isSpeaking={isSpeaking}
              isKeyConfigured={isKeyConfigured}
              onOpenArchitecture={() => setIsArchitectureOpen(true)}
            />
          </div>

          {/* Bottom Floating Input and Controls */}
          <footer className="shrink-0 z-20">
            <InputArea
              onSendMessage={handleSendMessage}
              onToggleListening={toggleListening}
              onCancelListening={cancelListening}
              onStopSpeaking={handleStopAll}
              state={activeCoreState}
              voiceInputStatus={voiceInputStatus}
              isSpeaking={isSpeaking}
              isRecognitionSupported={isRecognitionSupported}
              interimTranscript={interimTranscript}
              errorMessage={voiceError || speechError}
              onClearError={() => setSpeechError(null)}
              isSearchingWeb={isSearchingWeb}
            />
          </footer>
        </div>
      </main>

      {/* Voice & Speech Settings Modal */}
      <VoiceSettingsModal
        isOpen={isVoiceSettingsOpen}
        onClose={() => setIsVoiceSettingsOpen(false)}
        settings={voiceSettings}
        onSaveSettings={setVoiceSettings}
      />

      {/* Backend & OpenRouter Architecture Modal */}
      <ArchitectureModal
        isOpen={isArchitectureOpen}
        onClose={() => setIsArchitectureOpen(false)}
      />

      {/* iOS Safari PWA Install Modal */}
      {showIOSInstallGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#0b1224] p-6 border border-slate-800 shadow-2xl">
            <h3 className="text-base font-semibold text-white">Instalar no iPhone / iPad</h3>
            <p className="mt-2 text-xs text-slate-300 leading-relaxed">
              1. Toque no botão <strong>Compartilhar</strong> na barra do Safari.<br />
              2. Role para baixo e selecione <strong>Adicionar à Tela de Início</strong>.
            </p>
            <button
              onClick={() => setShowIOSInstallGuide(false)}
              className="mt-5 w-full min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 py-2 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
