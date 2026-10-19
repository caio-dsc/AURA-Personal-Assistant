import React from 'react';
import { Menu, Sliders, Network, Download, Sparkles } from 'lucide-react';
import { AuraState } from '../types/aura';

interface TopBarProps {
  onToggleMobileMenu: () => void;
  currentState: AuraState;
  onSetStatePreview: (state: AuraState) => void;
  onOpenVoiceSettings: () => void;
  onOpenArchitecture: () => void;
  onInstallPWA?: () => void;
  isPWAInstallable?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  onToggleMobileMenu,
  currentState,
  onSetStatePreview,
  onOpenVoiceSettings,
  onOpenArchitecture,
  onInstallPWA,
  isPWAInstallable = false,
}) => {
  const statesList: { key: AuraState; label: string }[] = [
    { key: 'idle', label: 'Repouso' },
    { key: 'listening', label: 'Ouvindo' },
    { key: 'thinking', label: 'Pensando' },
    { key: 'speaking', label: 'Falando' },
    { key: 'error', label: 'Erro' },
  ];

  return (
    <header className="h-16 px-4 sm:px-6 bg-[#070b16]/90 border-b border-slate-800/80 backdrop-blur-md flex items-center justify-between gap-4 sticky top-0 z-30">
      {/* Zone 1: Brand & Mobile Menu */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-300 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors"
          aria-label="Abrir menu de histórico"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-400 to-purple-600 flex items-center justify-center shadow-sm shadow-cyan-900/40">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap">
            AURA
          </span>
          <span className="hidden sm:inline-block text-[11px] text-slate-400 font-medium ml-1">
            Assistente Pessoal
          </span>
        </div>
      </div>

      {/* Zone 2: State Selector / Preview Switcher */}
      <div className="hidden md:flex items-center gap-1 p-1 bg-[#05070f] rounded-xl border border-slate-800">
        <span className="text-[11px] font-semibold text-slate-400 px-2 uppercase tracking-wider">
          Estado:
        </span>
        {statesList.map((item) => {
          const isActive = currentState === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onSetStatePreview(item.key)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-[#101b33] text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
              title={`Visualizar animação da esfera no estado de ${item.label}`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Zone 3: Primary Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {isPWAInstallable && (
          <button
            onClick={onInstallPWA}
            className="min-h-[44px] px-3 py-1.5 rounded-xl bg-cyan-950/50 hover:bg-cyan-900/50 text-cyan-300 border border-cyan-500/30 text-xs font-medium flex items-center gap-1.5 transition-all"
            title="Instalar como aplicativo no seu dispositivo"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Instalar PWA</span>
          </button>
        )}

        <button
          onClick={onOpenVoiceSettings}
          className="min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 text-slate-200 border border-slate-700/60 text-xs font-medium flex items-center gap-1.5 transition-colors"
          title="Ajustar vozes em português brasileiro e velocidade"
        >
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Voz</span>
        </button>

        <button
          onClick={onOpenArchitecture}
          className="min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/40 text-purple-200 border border-purple-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors"
          title="Ver arquitetura de conexão com OpenRouter e segurança"
        >
          <Network className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden sm:inline">OpenRouter</span>
        </button>
      </div>
    </header>
  );
};
