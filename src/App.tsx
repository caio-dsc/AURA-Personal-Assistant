/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { AuraState, ChatMessage, Conversation, VoiceSettings } from './types/aura';
import { auraService, INITIAL_CONVERSATIONS } from './services/auraService';
import { speechService } from './services/speechService';
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
  const [audioLevel, setAudioLevel] = useState<number>(0);

  // Speech Recognition & Synthesis state
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Voice Settings
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aura_voice_settings');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // fallback
        }
      }
    }
    return {
      voiceURI: '',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      autoSpeak: true,
    };
  });

  // UI Modals & Drawers
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isVoiceSettingsOpen, setIsVoiceSettingsOpen] = useState(false);
  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false);
  const [showIOSInstallGuide, setShowIOSInstallGuide] = useState(false);

  // Backend connection status
  const [isKeyConfigured, setIsKeyConfigured] = useState<boolean | null>(null);

  // PWA Install hook
  const { isInstallable, isIOS, install } = usePWAInstall();

  // Microphone audio feedback loop & request abort controller
  const audioIntervalRef = useRef<number | null>(null);
  const currentAbortRef = useRef<AbortController | null>(null);

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

  // Save voice settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('aura_voice_settings', JSON.stringify(voiceSettings));
    } catch {
      // ignore
    }
  }, [voiceSettings]);

  // Audio level polling when listening
  useEffect(() => {
    if (isListening) {
      audioIntervalRef.current = window.setInterval(() => {
        const level = speechService.getAudioVolume();
        setAudioLevel(level);
      }, 50);
    } else {
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
        audioIntervalRef.current = null;
      }
      if (!isSpeaking) {
        setAudioLevel(0);
      }
    }

    return () => {
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
      }
    };
  }, [isListening, isSpeaking]);

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

  // Core Speech Synthesis execution
  const speakText = (text: string) => {
    speechService.stopSpeaking();
    setIsSpeaking(true);
    setAuraState('speaking');

    speechService.speak(text, voiceSettings, {
      onStart: () => {
        setIsSpeaking(true);
        setAuraState('speaking');
      },
      onEnd: () => {
        setIsSpeaking(false);
        setAuraState('idle');
      },
      onError: () => {
        setIsSpeaking(false);
        setAuraState('idle');
      },
    });
  };

  // Interrupt Speech or active Thinking / generation
  const handleStopSpeaking = () => {
    if (currentAbortRef.current) {
      currentAbortRef.current.abort();
      currentAbortRef.current = null;
    }
    speechService.stopSpeaking();
    speechService.stopListening();
    setIsSpeaking(false);
    setIsListening(false);
    setAuraState('idle');
  };

  // Submit User Message
  const handleSendMessage = async (text: string) => {
    const trimmed = text.trim();
    // Impeça envios duplicados durante uma requisição em andamento
    if (!trimmed || auraState === 'thinking') return;

    // Interrupt any ongoing speech
    speechService.stopSpeaking();
    setIsSpeaking(false);
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

    // Mostre o estado Pensando enquanto a requisição estiver em andamento
    setAuraState('thinking');

    const controller = new AbortController();
    currentAbortRef.current = controller;

    try {
      // Chamada real ao endpoint /api/chat
      const response = await auraService.sendMessage(trimmed, updatedMessages, controller.signal);
      currentAbortRef.current = null;

      // Exiba a resposta real da IA quando ela chegar
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        sources: response.sources,
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

      // Atualiza status da chave para positivo se obteve resposta com sucesso
      setIsKeyConfigured(true);

      // Auto-read aloud se habilitado
      if (voiceSettings.autoSpeak) {
        speakText(response.content);
      } else {
        setAuraState('idle');
      }
    } catch (err: unknown) {
      currentAbortRef.current = null;
      const errorMsg = err instanceof Error ? err.message : 'Falha ao processar solicitação.';

      // Se a geração foi cancelada pelo usuário, apenas retorne ao repouso
      if (errorMsg.includes('cancelada')) {
        setAuraState('idle');
        return;
      }

      setAuraState('error');
      setSpeechError(errorMsg);

      // Adiciona o erro real da IA como mensagem explicativa para o usuário
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

  // Toggle Microphone Listening
  const handleToggleListening = () => {
    if (isListening) {
      speechService.stopListening();
      setIsListening(false);
      setAuraState('idle');
    } else {
      setSpeechError(null);
      setInterimTranscript('');
      setIsListening(true);
      setAuraState('listening');

      speechService.startListening({
        onStart: () => {
          setIsListening(true);
          setAuraState('listening');
        },
        onResult: (transcript, isFinal) => {
          if (isFinal) {
            setInterimTranscript('');
            setIsListening(false);
            speechService.stopListening();
            handleSendMessage(transcript);
          } else {
            setInterimTranscript(transcript);
          }
        },
        onError: (err) => {
          setIsListening(false);
          setSpeechError(err);
          setAuraState('error');
          setTimeout(() => setAuraState('idle'), 3000);
        },
        onEnd: () => {
          setIsListening(false);
          if (auraState === 'listening') {
            setAuraState('idle');
          }
        },
      });
    }
  };

  // Clicking the AI Sphere directly
  const handleCoreClick = () => {
    if (isSpeaking || auraState === 'speaking') {
      handleStopSpeaking();
    } else if (isListening) {
      handleToggleListening();
    } else if (speechService.isSpeechRecognitionSupported()) {
      handleToggleListening();
    }
  };

  // Manual state preview selector (to inspect visual states easily)
  const handleSetStatePreview = (previewState: AuraState) => {
    if (previewState === 'speaking' && !isSpeaking) {
      speakText('Testando o estado vocal da AURA em português brasileiro.');
    } else if (previewState === 'listening' && !isListening) {
      handleToggleListening();
    } else {
      handleStopSpeaking();
      setAuraState(previewState);
    }
  };

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
          currentState={auraState}
          onSetStatePreview={handleSetStatePreview}
          onOpenVoiceSettings={() => setIsVoiceSettingsOpen(true)}
          onOpenArchitecture={() => setIsArchitectureOpen(true)}
          onInstallPWA={isIOS ? () => setShowIOSInstallGuide(true) : install}
          isPWAInstallable={isInstallable || isIOS}
        />

        {/* Content Container: AI Core + Messages Feed */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Luminous AI Core Sphere */}
          <section className="shrink-0 pt-3 pb-2 flex flex-col items-center justify-center">
            <AuraCore
              state={auraState}
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
              onSpeakMessage={speakText}
              isSpeaking={isSpeaking}
              isKeyConfigured={isKeyConfigured}
              onOpenArchitecture={() => setIsArchitectureOpen(true)}
            />
          </div>

          {/* Bottom Floating Input and Controls */}
          <footer className="shrink-0 z-20">
            <InputArea
              onSendMessage={handleSendMessage}
              onToggleListening={handleToggleListening}
              onStopSpeaking={handleStopSpeaking}
              state={auraState}
              isListening={isListening}
              isSpeaking={isSpeaking}
              isRecognitionSupported={speechService.isSpeechRecognitionSupported()}
              interimTranscript={interimTranscript}
              errorMessage={speechError}
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
              className="mt-5 w-full min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 py-2 text-xs font-semibold text-white transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
