/**
 * AURA Service Layer
 * 
 * Conecta o frontend da AURA diretamente ao endpoint seguro Node.js (POST /api/chat),
 * que faz a ponte com a API do OpenRouter utilizando o modelo openrouter/free.
 * Não utiliza simulações como respostas reais e não expõe chaves no cliente.
 */

import { ChatMessage, CitationSource, Conversation } from '../types/aura';

export interface AuraResponse {
  content: string;
  sources?: CitationSource[];
  isReal: boolean;
  model: string;
  searchedWeb?: boolean;
  searchQuery?: string;
}

export interface BackendStatus {
  status: 'online' | 'offline';
  isKeyConfigured: boolean;
  isTavilyConfigured?: boolean;
  model: string;
}

export class AuraService {
  private endpoint: string;

  constructor(endpoint = '/api/chat') {
    this.endpoint = endpoint;
  }

  /**
   * Consulta o status do backend e se a chave OPENROUTER_API_KEY está configurada
   */
  public async checkBackendStatus(): Promise<BackendStatus> {
    try {
      const res = await fetch('/api/status', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        return {
          status: 'online',
          isKeyConfigured: Boolean(data.isKeyConfigured),
          isTavilyConfigured: Boolean(data.isTavilyConfigured),
          model: data.model || 'openrouter/free',
        };
      }
    } catch {
      // Backend inacessível no momento
    }
    return {
      status: 'offline',
      isKeyConfigured: false,
      model: 'openrouter/free',
    };
  }

  /**
   * Envia as mensagens para o backend seguro em /api/chat conectado ao OpenRouter.
   * Não simula sucesso se houver erro ou falta de chave.
   */
  public async sendMessage(
    prompt: string,
    history: ChatMessage[] = [],
    signal?: AbortSignal
  ): Promise<AuraResponse> {
    const trimmed = prompt.trim();
    if (!trimmed) {
      throw new Error('A mensagem não pode estar vazia.');
    }

    // Prepara o histórico no formato esperado pela API (system, user, assistant)
    const messagesPayload = history
      .filter((m) => !m.isError)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    // Adiciona a nova mensagem do usuário se ainda não estiver presente no histórico
    if (
      messagesPayload.length === 0 ||
      messagesPayload[messagesPayload.length - 1].content !== trimmed
    ) {
      messagesPayload.push({
        role: 'user',
        content: trimmed,
      });
    }

    let response: Response;

    try {
      response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          messages: messagesPayload,
        }),
        signal,
      });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error('Geração cancelada pelo usuário.');
      }
      throw new Error(
        'Não foi possível conectar ao servidor local da AURA (/api/chat). Verifique se o servidor Node.js está em execução.'
      );
    }

    if (!response.ok) {
      let errorMessage = 'Ocorreu um erro ao comunicar com a AURA.';
      try {
        const errorJson = await response.json();
        if (errorJson.error) {
          errorMessage = errorJson.error;
        }
      } catch {
        errorMessage = `Erro ${response.status}: ${response.statusText || 'Falha no servidor'}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();

    if (!data.content || typeof data.content !== 'string' || !data.content.trim()) {
      throw new Error(
        'O modelo openrouter/free retornou uma resposta em branco. Tente reformular sua pergunta.'
      );
    }

    return {
      content: data.content.trim(),
      sources: data.sources || [],
      isReal: true,
      model: data.model || 'openrouter/free',
      searchedWeb: Boolean(data.searchedWeb),
      searchQuery: data.searchQuery,
    };
  }
}

export const auraService = new AuraService();

// Conversa inicial de boas-vindas da sessão
export const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    title: 'Boas-vindas à AURA',
    updatedAt: new Date(),
    messages: [
      {
        id: 'msg-welcome',
        role: 'assistant',
        content: `Olá! Eu sou a **AURA**, sua assistente pessoal de inteligência artificial.

Estou configurada para responder utilizando o modelo **openrouter/free** através de um backend Node.js seguro, sem expor chaves de API no navegador.

Para começar, digite sua mensagem abaixo ou utilize o botão de microfone para conversar por voz em português brasileiro!`,
        timestamp: new Date(),
        isSimulated: false,
        model: 'openrouter/free',
      },
    ],
  },
];
