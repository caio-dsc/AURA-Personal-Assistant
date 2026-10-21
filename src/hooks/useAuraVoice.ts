import { useState, useEffect, useRef, useCallback } from 'react';
import { VoiceInputStatus, VoiceSettings } from '../types/aura';
import { speechService } from '../services/speechService';

interface UseAuraVoiceProps {
  onSendMessage: (text: string) => void;
  isBusy: boolean; // Thinking or processing
}

const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  voiceURI: '',
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  autoSpeak: true,
};

export function useAuraVoice({ onSendMessage, isBusy }: UseAuraVoiceProps) {
  // Voice Input (Recognition) State
  const [voiceInputStatus, setVoiceInputStatus] = useState<VoiceInputStatus>('idle');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Voice Output (Synthesis) State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [portugueseVoices, setPortugueseVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [hasPortugueseVoice, setHasPortugueseVoice] = useState(true);

  // Settings
  const [voiceSettings, setVoiceSettingsState] = useState<VoiceSettings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aura_voice_settings');
      if (saved) {
        try {
          return { ...DEFAULT_VOICE_SETTINGS, ...JSON.parse(saved) };
        } catch {
          // fallback
        }
      }
    }
    return DEFAULT_VOICE_SETTINGS;
  });

  // Audio level for visual animation (0 to 1)
  const [audioLevel, setAudioLevel] = useState<number>(0);

  // Guards against duplicate speech or speaking past history on load
  const lastSpokenMessageIdRef = useRef<string | null>(null);
  const audioIntervalRef = useRef<number | null>(null);
  const speechIntervalRef = useRef<number | null>(null);

  // Load available voices on mount and on voice list change
  useEffect(() => {
    const updateVoiceList = async () => {
      const voices = await speechService.initVoices();
      setAvailableVoices(voices);
      const ptList = speechService.getPortugueseVoices();
      setPortugueseVoices(ptList);
      const hasPt = speechService.hasPortugueseVoice();
      setHasPortugueseVoice(hasPt);

      // Default to best PT-BR voice if not yet chosen
      setVoiceSettingsState((prev) => {
        if (!prev.voiceURI && ptList.length > 0) {
          const def = speechService.getDefaultVoice();
          if (def) {
            return { ...prev, voiceURI: def.voiceURI };
          }
        }
        return prev;
      });
    };

    updateVoiceList();
  }, []);

  // Save settings to localStorage
  const setVoiceSettings = useCallback((newSettings: VoiceSettings) => {
    setVoiceSettingsState(newSettings);
    try {
      localStorage.setItem('aura_voice_settings', JSON.stringify(newSettings));
    } catch {
      // ignore
    }
  }, []);

  // Toggle auto speak on/off
  const toggleAutoSpeak = useCallback(() => {
    setVoiceSettingsState((prev) => {
      const updated = { ...prev, autoSpeak: !prev.autoSpeak };
      try {
        localStorage.setItem('aura_voice_settings', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  // Polling audio level when listening (measured via AnalyserNode)
  useEffect(() => {
    if (voiceInputStatus === 'listening' || voiceInputStatus === 'transcribing') {
      audioIntervalRef.current = window.setInterval(() => {
        const volume = speechService.getMicrophoneVolume();
        setAudioLevel(volume);
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
  }, [voiceInputStatus, isSpeaking]);

  // Audio wave pulse animation for Core when speaking
  useEffect(() => {
    if (isSpeaking) {
      let t = 0;
      speechIntervalRef.current = window.setInterval(() => {
        t += 0.2;
        // Harmonic vocal pulse wave for the core
        const pulse = 0.25 + Math.sin(t * 3) * 0.15 + Math.sin(t * 7) * 0.1;
        setAudioLevel(Math.max(0.1, Math.min(0.85, pulse)));
      }, 60);
    } else {
      if (speechIntervalRef.current) {
        clearInterval(speechIntervalRef.current);
        speechIntervalRef.current = null;
      }
      if (voiceInputStatus === 'idle') {
        setAudioLevel(0);
      }
    }

    return () => {
      if (speechIntervalRef.current) {
        clearInterval(speechIntervalRef.current);
      }
    };
  }, [isSpeaking, voiceInputStatus]);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    speechService.stopSpeaking();
    setIsSpeaking(false);
  }, []);

  // Speak response
  const speak = useCallback(
    (text: string, messageId?: string) => {
      if (!text || !speechService.isSpeechSynthesisSupported()) return;

      // Prevent speaking the exact same message twice
      if (messageId && lastSpokenMessageIdRef.current === messageId) {
        return;
      }
      if (messageId) {
        lastSpokenMessageIdRef.current = messageId;
      }

      stopSpeaking();
      setIsSpeaking(true);

      speechService.speak(text, voiceSettings, {
        onStart: () => {
          setIsSpeaking(true);
        },
        onEnd: () => {
          setIsSpeaking(false);
        },
        onError: () => {
          setIsSpeaking(false);
        },
      });
    },
    [voiceSettings, stopSpeaking]
  );

  // Start microphone listening
  const startListening = useCallback(() => {
    if (isBusy || voiceInputStatus === 'listening' || voiceInputStatus === 'sending') return;

    // Interrupt any ongoing speech
    stopSpeaking();
    setVoiceError(null);
    setInterimTranscript('');

    speechService.startListening({
      onStart: () => {
        setVoiceInputStatus('listening');
      },
      onStatusChange: (status) => {
        setVoiceInputStatus(status);
      },
      onResult: (transcript, isFinal) => {
        if (isFinal) {
          setInterimTranscript('');
          setVoiceInputStatus('sending');
          // Dispara o envio diretamente na conversa sem duplicar mensagens
          onSendMessage(transcript);
        } else {
          setVoiceInputStatus('transcribing');
          setInterimTranscript(transcript);
        }
      },
      onError: (err) => {
        setVoiceInputStatus('error');
        setVoiceError(err);
        setInterimTranscript('');
        setTimeout(() => {
          setVoiceInputStatus('idle');
        }, 4000);
      },
      onEnd: () => {
        setVoiceInputStatus((prev) => (prev === 'sending' ? prev : 'idle'));
      },
    });
  }, [isBusy, voiceInputStatus, stopSpeaking, onSendMessage]);

  // Stop listening gracefully (processes pending audio)
  const stopListening = useCallback(() => {
    speechService.stopListening();
  }, []);

  // Cancel listening (discards audio without sending)
  const cancelListening = useCallback(() => {
    speechService.cancelListening();
    setVoiceInputStatus('idle');
    setInterimTranscript('');
    setVoiceError(null);
    setAudioLevel(0);
  }, []);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (voiceInputStatus === 'listening' || voiceInputStatus === 'transcribing') {
      stopListening();
    } else {
      startListening();
    }
  }, [voiceInputStatus, startListening, stopListening]);

  return {
    voiceInputStatus,
    isListening: voiceInputStatus === 'listening' || voiceInputStatus === 'transcribing',
    isSpeaking,
    interimTranscript,
    voiceError,
    audioLevel,
    voiceSettings,
    setVoiceSettings,
    toggleAutoSpeak,
    availableVoices,
    portugueseVoices,
    hasPortugueseVoice,
    isRecognitionSupported: speechService.isSpeechRecognitionSupported(),
    isSynthesisSupported: speechService.isSpeechSynthesisSupported(),
    startListening,
    stopListening,
    cancelListening,
    toggleListening,
    speak,
    stopSpeaking,
  };
}
