/**
 * Web Speech API Service (Recognition & Synthesis)
 * Tailored for Brazilian Portuguese with graceful fallbacks
 */

import { VoiceSettings } from '../types/aura';

// Type definitions for webkitSpeechRecognition
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
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private cachedVoices: SpeechSynthesisVoice[] = [];
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;


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
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          this.cachedVoices = voices;
          resolve(voices);
        }
      };

      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }

      // Fallback timeout in case onvoiceschanged does not fire
      setTimeout(() => {
        if (this.cachedVoices.length === 0) {
          this.cachedVoices = window.speechSynthesis.getVoices();
        }
        resolve(this.cachedVoices);
      }, 500);
    });
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (this.cachedVoices.length === 0 && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.cachedVoices = window.speechSynthesis.getVoices();
    }
    return this.cachedVoices;
  }

  public getPortugueseVoices(): SpeechSynthesisVoice[] {
    const all = this.getVoices();
    const ptVoices = all.filter(
      (v) => v.lang.toLowerCase().startsWith('pt-br') || v.lang.toLowerCase().startsWith('pt_br')
    );
    if (ptVoices.length > 0) return ptVoices;

    // Secondary fallback: any Portuguese voice
    const anyPt = all.filter((v) => v.lang.toLowerCase().startsWith('pt'));
    if (anyPt.length > 0) return anyPt;

    return all;
  }

  public getDefaultVoice(): SpeechSynthesisVoice | null {
    const ptVoices = this.getPortugueseVoices();
    if (ptVoices.length > 0) {
      // Prioritize natural or Brazilian voices
      const preferred = ptVoices.find(
        (v) =>
          v.name.includes('Google') ||
          v.name.includes('Luciana') ||
          v.name.includes('Felipe') ||
          v.name.includes('Daniel') ||
          v.name.includes('Maria') ||
          v.name.includes('Francisca')
      );
      return preferred || ptVoices[0];
    }
    const all = this.getVoices();
    return all[0] || null;
  }

  public isSpeechSynthesisSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
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

    // Stop any ongoing speech first
    this.stopSpeaking();

    // Strip code blocks and Markdown syntax for natural vocalization
    const plainText = text
      .replace(/```[\s\S]*?```/g, 'Bloco de código omitido na leitura de voz.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*_#~]/g, '')
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
        utterance.lang = 'pt-BR';
      }

      utterance.rate = settings.rate || 1.0;
      utterance.pitch = settings.pitch || 1.0;
      utterance.volume = settings.volume ?? 1.0;

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

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      this.currentUtterance = null;
      callbacks?.onError?.(err);
    }
  }

  public stopSpeaking(): void {
    if (this.isSpeechSynthesisSupported()) {
      window.speechSynthesis.cancel();
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
    onStart?: () => void;
    onEnd?: () => void;
  }): Promise<void> {
    if (!this.isSpeechRecognitionSupported()) {
      callbacks.onError('O reconhecimento de voz não é suportado pelo seu navegador.');
      return;
    }

    // Stop speaking before listening to avoid echo
    this.stopSpeaking();

    const SpeechRecClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecClass) return;

    try {
      this.recognition = new SpeechRecClass();
      this.recognition.lang = 'pt-BR';
      this.recognition.continuous = false;
      this.recognition.interimResults = true;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.initAudioAnalyser();
        callbacks.onStart?.();
      };

      this.recognition.onresult = (event: SpeechRecognitionEventLike) => {
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
          callbacks.onResult(finalTranscript, true);
        } else if (interimTranscript) {
          callbacks.onResult(interimTranscript, false);
        }
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
        let errorMsg = 'Falha no reconhecimento de voz.';
        if (event.error === 'not-allowed') {
          errorMsg = 'Acesso ao microfone negado ou bloqueado pelo navegador.';
        } else if (event.error === 'no-speech') {
          errorMsg = 'Nenhum áudio detectado. Fale próximo ao microfone.';
        } else if (event.error === 'network') {
          errorMsg = 'Erro de rede no serviço de reconhecimento de fala.';
        }
        this.stopAudioAnalyser();
        this.isListening = false;
        callbacks.onError(errorMsg);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.stopAudioAnalyser();
        callbacks.onEnd?.();
      };

      this.recognition.start();
    } catch (err: unknown) {
      this.isListening = false;
      this.stopAudioAnalyser();
      callbacks.onError(err instanceof Error ? err.message : 'Não foi possível iniciar o microfone.');
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

  // Audio Context & Analyser for real mic feedback on canvas core
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
      // Stream visualizer is optional; recognition still runs
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

  public getAudioVolume(): number {
    if (!this.analyser || !this.dataArray) return 0;
    this.analyser.getByteFrequencyData(this.dataArray);
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    const avg = sum / this.dataArray.length;
    return Math.min(1, avg / 128); // 0 to 1
  }
}

export const speechService = new SpeechService();
