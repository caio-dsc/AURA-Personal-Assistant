/**
 * AURA - Type Definitions
 */

export type AuraState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

export type MessageRole = 'user' | 'assistant' | 'system';

export interface CitationSource {
  id?: string;
  title: string;
  url: string;
  domain?: string;
  snippet?: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  state?: AuraState;
  sources?: CitationSource[];
  isSimulated?: boolean;
  isError?: boolean;
  model?: string;
  searchedWeb?: boolean;
  searchQuery?: string;
}

export interface Conversation {
  id: string;
  title: string;
  updatedAt: Date;
  messages: ChatMessage[];
}

export interface VoiceSettings {
  voiceURI: string;
  rate: number; // 0.5 to 2.0
  pitch: number; // 0.5 to 1.5
  volume: number; // 0 to 1
  autoSpeak: boolean; // whether to automatically speak AI responses
}

export type VoiceInputStatus = 'idle' | 'listening' | 'transcribing' | 'sending' | 'error';

export interface SpeechRecognitionState {
  status: VoiceInputStatus;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  isSupported: boolean;
  error?: string | null;
}

export interface BackendIntegrationSpec {
  status: 'simulated' | 'connected' | 'error';
  endpoint: string;
  provider: 'OpenRouter';
  targetModel: string;
  notes: string;
}
