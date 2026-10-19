import React from 'react';
import { Plus, MessageSquare, Trash2, Sliders, Network, Download, X } from 'lucide-react';
import { Conversation } from '../types/aura';

interface SidebarProps {
  conversations: Conversation[];
  activeId: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onOpenVoiceSettings: () => void;
  onOpenArchitecture: () => void;
  onInstallPWA?: () => void;
  isPWAInstallable?: boolean;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onOpenVoiceSettings,
  onOpenArchitecture,
  onInstallPWA,
  isPWAInstallable = false,
  isOpenMobile,
  onCloseMobile,
}) => {
  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-72 sm:w-80 bg-[#070b16] border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center shadow-md shadow-cyan-950/50">
              <span className="text-xs font-black tracking-tighter text-white">A</span>
            </div>
            <div>
              <span className="font-bold text-sm tracking-wider text-white">AURA</span>
              <span className="block text-[10px] text-slate-400 font-mono">v1.0 &middot; LOCAL CORE</span>
            </div>
          </div>

          {/* Mobile Close Button */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-lg transition-colors"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={() => {
              onNewConversation();
              onCloseMobile();
            }}
            className="w-full min-h-[44px] py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-cyan-600/20 to-purple-600/20 hover:from-cyan-600/30 hover:to-purple-600/30 border border-cyan-500/30 hover:border-cyan-400/50 text-cyan-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm group active:scale-[0.99]"
          >
            <Plus className="w-4 h-4 text-cyan-400 group-hover:rotate-90 transition-transform duration-200" />
            <span>Nova Conversa</span>
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div className="px-2 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Histórico Recente
          </div>

          {conversations.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-slate-500">
              Nenhuma conversa gravada.
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive = conv.id === activeId;
              return (
                <div
                  key={conv.id}
                  className={`group relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#0f172a] text-white border border-cyan-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#0b1222]'
                  }`}
                  onClick={() => {
                    onSelectConversation(conv.id);
                    onCloseMobile();
                  }}
                >
                  <MessageSquare
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-400'
                    }`}
                  />
                  <span className="truncate flex-1 font-medium">{conv.title}</span>

                  {/* Delete Conversation Action */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(conv.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity"
                    title="Excluir conversa"
                    aria-label={`Excluir conversa ${conv.title}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer Actions */}
        <div className="p-3 border-t border-slate-800/80 space-y-1 bg-[#05070f]">
          {isPWAInstallable && (
            <button
              onClick={() => {
                onInstallPWA?.();
                onCloseMobile();
              }}
              className="w-full min-h-[44px] py-2 px-3 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/40 text-cyan-300 border border-cyan-500/30 text-xs font-medium flex items-center gap-2.5 transition-colors"
            >
              <Download className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Instalar Aplicativo (PWA)</span>
            </button>
          )}

          <button
            onClick={() => {
              onOpenVoiceSettings();
              onCloseMobile();
            }}
            className="w-full min-h-[44px] py-2 px-3 rounded-lg hover:bg-[#0b1222] text-slate-300 hover:text-white text-xs font-medium flex items-center gap-2.5 transition-colors"
          >
            <Sliders className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Configurações de Voz</span>
          </button>

          <button
            onClick={() => {
              onOpenArchitecture();
              onCloseMobile();
            }}
            className="w-full min-h-[44px] py-2 px-3 rounded-lg hover:bg-[#0b1222] text-slate-300 hover:text-white text-xs font-medium flex items-center gap-2.5 transition-colors"
          >
            <Network className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Conexão OpenRouter</span>
          </button>
        </div>
      </aside>
    </>
  );
};
