import React, { useState, useEffect } from 'react';
import { X, Volume2, Play, Sliders, Check } from 'lucide-react';
import { VoiceSettings } from '../types/aura';
import { speechService } from '../services/speechService';

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: VoiceSettings;
  onSaveSettings: (settings: VoiceSettings) => void;
}

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [localSettings, setLocalSettings] = useState<VoiceSettings>(settings);
  const [isPlayingTest, setIsPlayingTest] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (isOpen) {
      speechService.initVoices().then((v) => {
        setVoices(v);
        if (!localSettings.voiceURI && v.length > 0) {
          const def = speechService.getDefaultVoice();
          if (def) {
            setLocalSettings((prev) => ({ ...prev, voiceURI: def.voiceURI }));
          }
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestVoice = () => {
    setIsPlayingTest(true);
    speechService.speak(
      'Olá! Eu sou a AURA, sua assistente pessoal inteligente. A voz está configurada com sucesso.',
      localSettings,
      {
        onStart: () => setIsPlayingTest(true),
        onEnd: () => setIsPlayingTest(false),
        onError: () => setIsPlayingTest(false),
      }
    );
  };

  const handleSave = () => {
    onSaveSettings(localSettings);
    onClose();
  };

  const ptVoices = voices.filter((v) => v.lang.toLowerCase().includes('pt'));
  const otherVoices = voices.filter((v) => !v.lang.toLowerCase().includes('pt'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-[#0b1224] border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#070b16]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-950/60 text-cyan-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">
                Configurações de Voz & Áudio
              </h2>
              <p className="text-xs text-slate-400">
                Web Speech API & Síntese em Português (pt-BR)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-lg transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Voice Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Voz do Dispositivo
            </label>
            <select
              value={localSettings.voiceURI}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, voiceURI: e.target.value })
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#05070f] border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
            >
              {ptVoices.length > 0 && (
                <optgroup label="Português Brasileiro & Português">
                  {ptVoices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </optgroup>
              )}
              {otherVoices.length > 0 && (
                <optgroup label="Outras vozes instaladas">
                  {otherVoices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </optgroup>
              )}
              {voices.length === 0 && (
                <option value="">Voz padrão do sistema</option>
              )}
            </select>
          </div>

          {/* Sliders: Rate & Pitch */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1.5">
                <span>Velocidade de Fala</span>
                <span className="font-mono text-cyan-400">
                  {localSettings.rate.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min="0.6"
                max="1.6"
                step="0.1"
                value={localSettings.rate}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    rate: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-cyan-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1.5">
                <span>Tom da Voz (Pitch)</span>
                <span className="font-mono text-cyan-400">
                  {localSettings.pitch.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min="0.7"
                max="1.4"
                step="0.1"
                value={localSettings.pitch}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    pitch: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-cyan-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Auto Speak Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#05070f] border border-slate-800">
            <div>
              <span className="block text-sm font-medium text-slate-200">
                Falar respostas automaticamente
              </span>
              <span className="block text-xs text-slate-400">
                Lê as respostas de texto geradas pela AURA em voz alta
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                setLocalSettings({
                  ...localSettings,
                  autoSpeak: !localSettings.autoSpeak,
                })
              }
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                localSettings.autoSpeak ? 'bg-cyan-500 justify-end' : 'bg-slate-700 justify-start'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
            </button>
          </div>

          {/* Test Voice Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleTestVoice}
              disabled={isPlayingTest}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center justify-center gap-2 border border-slate-700 transition-colors"
            >
              <Play className={`w-3.5 h-3.5 ${isPlayingTest ? 'text-cyan-400 animate-spin' : ''}`} />
              <span>{isPlayingTest ? 'Reproduzindo teste...' : 'Ouvir Teste de Voz'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800/80 bg-[#070b16]">
          <button
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="min-h-[44px] px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-950/40 hover:brightness-110 transition-all flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Salvar Configurações</span>
          </button>
        </div>
      </div>
    </div>
  );
};
