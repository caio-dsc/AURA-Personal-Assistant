import React, { useState } from 'react';
import { X, Network, ShieldCheck, Server, Key, Copy, Check, ExternalLink } from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const backendCodeSnippet = `// Exemplo de rota segura no Backend Node.js / Express (server.ts)
import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

// NUNCA exponha OPENROUTER_API_KEY no cliente React!
// A chave deve residir apenas no servidor em .env
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!OPENROUTER_API_KEY) {
      return res.status(503).json({
        error: 'Chave OPENROUTER_API_KEY ausente no .env do servidor.'
      });
    }

    // Requisição ao OpenRouter utilizando o modelo gratuito
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + OPENROUTER_API_KEY,
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
        'X-Title': 'AURA Assistant',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openrouter/free',
        messages,
        temperature: 0.7
      })
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || 'Sem resposta do modelo.';

    return res.json({
      content,
      model: data.model || 'OpenRouter',
      sources: []
    });
  } catch (error) {
    console.error('Erro na rota OpenRouter:', error);
    return res.status(500).json({ error: 'Erro interno ao consultar OpenRouter.' });
  }
});`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(backendCodeSnippet);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl bg-[#0b1224] border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#070b16]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-950/60 text-cyan-400">
              <Network className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">
                Arquitetura de Conexão com OpenRouter
              </h2>
              <p className="text-xs text-slate-400">
                Padrão BFF Seguro &middot; Sem chaves no cliente &middot; Sem API Gemini
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

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-slate-300 text-xs sm:text-sm leading-relaxed">
          {/* Security Banner */}
          <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-white block">
                Princípio de Segurança Zero-Client-Secret
              </span>
              <p className="text-xs text-slate-300 leading-normal">
                Como solicitado estritamente nos requisitos, a chave da API OpenRouter nunca deve ser digitada ou armazenada no frontend. Toda a inteligência artificial será roteada por um servidor backend Node.js intermediário.
              </p>
            </div>
          </div>

          {/* 3-Tier Architecture Diagram */}
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3">
              Fluxo Arquitetural da Aplicação
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-[#05070f] border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs">
                  <div className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span>1. Frontend AURA</span>
                </div>
                <p className="text-[12px] text-slate-400">
                  SPA React + Web Speech API + Canvas Core. Dispara <code className="text-cyan-300 font-mono">POST /api/chat</code>.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#05070f] border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs">
                  <Server className="w-3.5 h-3.5" />
                  <span>2. Backend Node</span>
                </div>
                <p className="text-[12px] text-slate-400">
                  Express Server guardando chaves e decidindo se a consulta exige busca recente.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#05070f] border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  <span>3. Tavily Search</span>
                </div>
                <p className="text-[12px] text-slate-400">
                  Motor de pesquisa para IA via <code className="text-blue-300 font-mono">TAVILY_API_KEY</code> para fatos em tempo real.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#05070f] border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                  <Key className="w-3.5 h-3.5" />
                  <span>4. OpenRouter</span>
                </div>
                <p className="text-[12px] text-slate-400">
                  Sintetiza a resposta com base no prompt de sistema e nas fontes web recolhidas.
                </p>
              </div>
            </div>
          </div>

          {/* Backend Code Template */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Código para o Servidor Node.js (server.ts)
              </h3>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copiar Endpoint</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3.5 rounded-xl bg-[#05070f] border border-slate-800 font-mono text-[11px] leading-relaxed text-slate-300 overflow-x-auto max-h-56">
              <code>{backendCodeSnippet}</code>
            </pre>
          </div>

          {/* Useful links */}
          <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
            <span>Para mais detalhes sobre chaves e modelos:</span>
            <a
              href="https://openrouter.ai/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-cyan-400 hover:underline"
            >
              <span>Documentação OpenRouter</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-800/80 bg-[#070b16]">
          <button
            onClick={onClose}
            className="min-h-[44px] px-5 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
