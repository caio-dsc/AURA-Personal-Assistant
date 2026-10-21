/**
 * Web Speech API Service (Recognition & Synthesis)
 * Tailored for Brazilian Portuguese with graceful fallbacks
 */

import { VoiceInputStatus, VoiceSettings } from '../types/aura';

// Type definitions for Web Speech API
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      length: number;
      [index: number]: {
        transcript: string;
        confidence: number;
      };
    };
  };
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export class SpeechService {
  private recognition: SpeechRecognitionInstance | null = null;
  private isListening = false;
  private isCancelled = false;
  private hasSubmittedInCurrentSession = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private cachedVoices: SpeechSynthesisVoice[] = [];
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private isAudioUnlocked = false;

  constructor() {
    this.initVoices();
  }

  // Voice Synthesis (TTS)
  public initVoices(): Promise<SpeechSynthesisVoice[]> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        resolve([]);
        return;
      }

      const loadVoices = () => {
        try {
          const voices = window.speechSynthesis.getVoices();
          if (voices.length > 0) {
            this.cachedVoices = voices;
            resolve(voices);
          }
        } catch {
          resolve([]);
        }
      };

      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }

      // Fallback timeout in case onvoiceschanged does not fire (common in mobile Safari)
      setTimeout(() => {
        if (this.cachedVoices.length === 0) {
          try {
            this.cachedVoices = window.speechSynthesis.getVoices();
          } catch {
            // ignore
          }
        }
        resolve(this.cachedVoices);
      }, 500);
    });
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (this.cachedVoices.length === 0 && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        this.cachedVoices = window.speechSynthesis.getVoices();
      } catch {
        // ignore
      }
    }
    return this.cachedVoices;
  }

  public getPortugueseVoices(): SpeechSynthesisVoice[] {
    const all = this.getVoices();
    const ptVoices = all.filter((v) => {
      const lang = v.lang.replace('_', '-').toLowerCase();
      return lang.startsWith('pt-br');
    });
    if (ptVoices.length > 0) return ptVoices;

    // Secondary fallback: any Portuguese dialect
    const anyPt = all.filter((v) => {
      const lang = v.lang.replace('_', '-').toLowerCase();
      return lang.startsWith('pt');
    });
    if (anyPt.length > 0) return anyPt;

    return all;
  }

  public hasPortugueseVoice(): boolean {
    const all = this.getVoices();
    return all.some((v) => v.lang.replace('_', '-').toLowerCase().startsWith('pt'));
  }

  public getDefaultVoice(): SpeechSynthesisVoice | null {
    const ptVoices = this.getPortugueseVoices();
    if (ptVoices.length > 0) {
      // Prioritize natural or high-quality Brazilian voices
      const preferred = ptVoices.find(
        (v) =>
          v.name.includes('Google') ||
          v.name.includes('Luciana') ||
          v.name.includes('Felipe') ||
          v.name.includes('Daniel') ||
          v.name.includes('Maria') ||
          v.name.includes('Francisca') ||
          v.name.includes('Brazilian')
      );
      return preferred || ptVoices[0];
    }
    const all = this.getVoices();
    return all[0] || null;
  }

  public isSpeechSynthesisSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  /**
   * Unlocks audio playback for mobile browsers (iOS Safari, Android Chrome)
   * which require a user gesture before playing audio.
   */
  public unlockAudio(): void {
    if (this.isAudioUnlocked || typeof window === 'undefined') return;
    try {
      if ('speechSynthesis' in window) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }
      this.isAudioUnlocked = true;
    } catch {
      // ignore
    }
  }

  public speak(
    text: string,
    settings: VoiceSettings,
    callbacks?: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: unknown) => void;
    }
  ): void {
    if (!this.isSpeechSynthesisSupported()) {
      callbacks?.onError?.(new Error('Síntese de voz não suportada neste navegador.'));
      return;
    }

    this.unlockAudio();

    // Stop any ongoing speech first
    this.stopSpeaking();

    // Strip code blocks, raw URLs, and Markdown formatting for clean, natural vocalization
    const plainText = text
      .replace(/```[\s\S]*?```/g, 'Bloco de código omitido na leitura.')
      .replace(/https?:\/\/[^\s)\]]+/gi, '') // Remove URLs completas (http:// e https://) para não soletrar na voz
      .replace(/www\.[^\s)\]]+/gi, '') // Remove links www
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Preserva texto âncora legível e descarta a URL
      .replace(/[*_#~>]/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (!plainText) {
      callbacks?.onEnd?.();
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(plainText);
      this.currentUtterance = utterance;

      // Select voice
      const voices = this.getVoices();
      const selected = voices.find((v) => v.voiceURI === settings.voiceURI) || this.getDefaultVoice();
      if (selected) {
        utterance.voice = selected;
        utterance.lang = selected.lang;
      } else {
        // Fallback for devices without explicit pt-BR voice profile installed:
        // Setting lang to pt-BR still tells the system TTS engine to apply Portuguese phonetics
        utterance.lang = 'pt-BR';
      }

      utterance.rate = Math.max(0.5, Math.min(2.0, settings.rate || 1.0));
      utterance.pitch = Math.max(0.5, Math.min(1.5, settings.pitch || 1.0));
      utterance.volume = Math.max(0, Math.min(1.0, settings.volume ?? 1.0));

      utterance.onstart = () => {
        callbacks?.onStart?.();
      };

      utterance.onend = () => {
        this.currentUtterance = null;
        callbacks?.onEnd?.();
      };

      utterance.onerror = (e) => {
        this.currentUtterance = null;
        // Speech cancellation fires 'canceled' or 'interrupted', which is expected
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          callbacks?.onError?.(e);
        } else {
          callbacks?.onEnd?.();
        }
      };

      // Workaround for Chrome speech synthesis getting paused on longer texts
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      this.currentUtterance = null;
      callbacks?.onError?.(err);
    }
  }

  public stopSpeaking(): void {
    if (this.isSpeechSynthesisSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    this.currentUtterance = null;
  }

  public isSpeaking(): boolean {
    if (!this.isSpeechSynthesisSupported()) return false;
    return window.speechSynthesis.speaking;
  }

  // Speech Recognition (STT)
  public isSpeechRecognitionSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
    );
  }

  public async startListening(callbacks: {
    onResult: (transcript: string, isFinal: boolean) => void;
    onError: (error: string) => void;
    onStatusChange?: (status: VoiceInputStatus) => void;
    onStart?: () => void;
    onEnd?: () => void;
  }): Promise<void> {
    if (!this.isSpeechRecognitionSupported()) {
      callbacks.onError('O reconhecimento de voz não é suportado por este navegador (recomendamos Chrome, Edge ou Safari). Você pode continuar conversando por texto.');
      callbacks.onStatusChange?.('error');
      return;
    }

    // Stop speaking before listening to avoid echo
    this.stopSpeaking();
    this.unlockAudio();

    const SpeechRecClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecClass) return;

    this.isCancelled = false;
    this.hasSubmittedInCurrentSession = false;

    try {
      this.recognition = new SpeechRecClass();
      this.recognition.lang = 'pt-BR';
      this.recognition.continuous = false;
      this.recognition.interimResults = true;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.initAudioAnalyser();
        callbacks.onStatusChange?.('listening');
        callbacks.onStart?.();
      };

      this.recognition.onresult = (event: SpeechRecognitionEventLike) => {
        if (this.isCancelled) return;

        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript;
          } else {
            interimTranscript += item[0].transcript;
          }
        }

        if (finalTranscript) {
          if (!this.hasSubmittedInCurrentSession) {
            this.hasSubmittedInCurrentSession = true;
            callbacks.onStatusChange?.('sending');
            callbacks.onResult(finalTranscript.trim(), true);
          }
        } else if (interimTranscript) {
          callbacks.onStatusChange?.('transcribing');
          callbacks.onResult(interimTranscript, false);
        }
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
        if (this.isCancelled || event.error === 'aborted') {
          this.stopAudioAnalyser();
          this.isListening = false;
          callbacks.onStatusChange?.('idle');
          return;
        }

        let errorMsg = 'Falha no reconhecimento de voz.';
        if (event.error === 'not-allowed') {
          errorMsg = 'Permissão de microfone negada. Clique no ícone de permissões do navegador para liberar o acesso ao microfone.';
        } else if (event.error === 'no-speech') {
          errorMsg = 'Nenhum som detectado. Fale próximo ao microfone e tente novamente.';
        } else if (event.error === 'audio-capture') {
          errorMsg = 'Nenhum microfone encontrado ou está sendo usado por outro aplicativo.';
        } else if (event.error === 'network') {
          errorMsg = 'Erro de rede na comunicação com o serviço de voz do navegador.';
        }

        this.stopAudioAnalyser();
        this.isListening = false;
        callbacks.onStatusChange?.('error');
        callbacks.onError(errorMsg);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.stopAudioAnalyser();
        callbacks.onStatusChange?.('idle');
        callbacks.onEnd?.();
      };

      this.recognition.start();
    } catch (err: unknown) {
      this.isListening = false;
      this.stopAudioAnalyser();
      callbacks.onStatusChange?.('error');
      callbacks.onError(err instanceof Error ? err.message : 'Não foi possível acessar o microfone.');
    }
  }

  public stopListening(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
    }
    this.isListening = false;
    this.stopAudioAnalyser();
  }

  public cancelListening(): void {
    this.isCancelled = true;
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // ignore
      }
    }
    this.isListening = false;
    this.stopAudioAnalyser();
  }

  // Audio Context & Analyser for real microphone volume measurement
  private async initAudioAnalyser() {
    try {
      if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);
      this.dataArray = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
    } catch {
      // Audio stream analysis is optional; speech recognition still functions without it
    }
  }

  private stopAudioAnalyser() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.analyser = null;
    this.dataArray = null;
  }

  /**
   * Retorna o nível de volume do microfone de 0 a 1 medido via Web Audio API.
   * Se a medição não estiver disponível, retorna 0.
   */
  public getMicrophoneVolume(): number {
    if (!this.analyser || !this.dataArray) return 0;
    try {
      this.analyser.getByteFrequencyData(this.dataArray);
      let sum = 0;
      for (let i = 0; i < this.dataArray.length; i++) {
        sum += this.dataArray[i];
      }
      const avg = sum / this.dataArray.length;
      return Math.min(1, avg / 128); // 0 a 1
    } catch {
      return 0;
    }
  }

  public hasRealAudioMeasurement(): boolean {
    return Boolean(this.analyser && this.dataArray);
  }
}

export const speechService = new SpeechService();
