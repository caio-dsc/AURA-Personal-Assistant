import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  shouldSearchWeb,
  performTavilySearch,
  formatSearchContextForPrompt,
} from './src/server/searchService.ts';
import { CitationSource } from './src/types/aura.ts';

// Carrega variáveis de ambiente de .env e de C_Key.env
dotenv.config();
const potentialKeyPaths = ['C_Key.env', path.resolve(process.cwd(), 'C_Key.env'), '/C_Key.env'];
for (const p of potentialKeyPaths) {
  if (fs.existsSync(p)) {
    try {
      const content = fs.readFileSync(p, 'utf-8');
      const parsed = dotenv.parse(content);
      for (const [k, v] of Object.entries(parsed)) {
        if (v && (!process.env[k] || process.env[k] === 'MY_OPENROUTER_API_KEY' || process.env[k] === 'MY_TAVILY_API_KEY')) {
          process.env[k] = v;
        }
      }
    } catch {
      dotenv.config({ path: p });
    }
    break;
  }
}


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

const app = express();
app.use(express.json({ limit: '1mb' }));

// Mensagem de sistema da assistente AURA
const SYSTEM_PROMPT = `Você é a AURA, uma assistente pessoal de inteligência artificial futurista, elegante, precisa e prestativa.
Responda sempre em português brasileiro com clareza, tom acolhedor e respostas bem estruturadas.
Quando apresentar código, use blocos de código formatados com a linguagem especificada.
Mantenha respostas inteligentes, objetivas e agradáveis de ler.`;

interface ChatMessageInput {
  role: string;
  content: string;
}

// Endpoint de verificação de status do servidor e das chaves (sem nunca expor as chaves)
app.get('/api/status', (_req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  const tavilyKey = process.env.TAVILY_API_KEY?.trim();
  const isKeyConfigured = Boolean(
    apiKey &&
      apiKey !== 'MY_OPENROUTER_API_KEY' &&
      apiKey !== 'sk-or-v1-...' &&
      apiKey.length > 10
  );
  const isTavilyConfigured = Boolean(
    tavilyKey &&
      tavilyKey !== 'MY_TAVILY_API_KEY' &&
      tavilyKey !== 'tvly-...' &&
      tavilyKey.length > 5
  );
  return res.json({
    status: 'online',
    isKeyConfigured,
    isTavilyConfigured,
    model: 'openrouter/free',
  });
});

// POST /api/chat - Conexão segura com OpenRouter
app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();

  // 1. Verificação rigorosa da presença da chave no servidor
  if (!apiKey || apiKey === 'MY_OPENROUTER_API_KEY' || apiKey === 'sk-or-v1-...') {
    return res.status(503).json({
      error:
        'A chave OPENROUTER_API_KEY não está configurada no servidor. Adicione sua chave de API do OpenRouter no arquivo .env (ex: OPENROUTER_API_KEY="sk-or-v1-...") para habilitar respostas reais.',
      code: 'API_KEY_MISSING',
    });
  }

  // 2. Validação dos dados recebidos
  const { messages, prompt } = req.body;
  let rawMessages: ChatMessageInput[] = [];

  if (Array.isArray(messages) && messages.length > 0) {
    rawMessages = messages;
  } else if (typeof prompt === 'string' && prompt.trim()) {
    rawMessages = [{ role: 'user', content: prompt.trim() }];
  } else {
    return res.status(400).json({
      error: 'Formato de requisição inválido. Envie um histórico de mensagens válido.',
      code: 'INVALID_REQUEST',
    });
  }

  // Aceita somente os papéis system, user e assistant
  const validRoles = new Set(['system', 'user', 'assistant']);
  const sanitizedMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];

  for (const m of rawMessages) {
    if (!m || typeof m !== 'object') continue;
    const role = String(m.role).toLowerCase();
    const content = typeof m.content === 'string' ? m.content.trim() : '';

    if (!validRoles.has(role) || !content) continue;

    // Limita tamanho da mensagem individual (máx 4000 caracteres)
    const truncatedContent =
      content.length > 4000 ? content.slice(0, 4000) + '... (mensagem truncada)' : content;

    sanitizedMessages.push({
      role: role as 'system' | 'user' | 'assistant',
      content: truncatedContent,
    });
  }

  if (sanitizedMessages.length === 0) {
    return res.status(400).json({
      error: 'Nenhuma mensagem válida para envio.',
      code: 'EMPTY_MESSAGES',
    });
  }

  // Limita o histórico às 15 mensagens mais recentes para não estourar o limite de contexto
  const recentMessages = sanitizedMessages.slice(-15);

  // 3. Decisão de Pesquisa Automática na Web (Tavily)
  const lastUserMsg = [...sanitizedMessages].reverse().find((m) => m.role === 'user');
  const userPromptText = lastUserMsg?.content || '';
  const searchDecision = shouldSearchWeb(userPromptText);

  let searchSources: CitationSource[] = [];
  let searchedWeb = false;
  let searchContextDirective = '';

  if (searchDecision.requiresSearch) {
    const tavilyKey = process.env.TAVILY_API_KEY?.trim();
    const searchResult = await performTavilySearch(searchDecision.query, tavilyKey);

    if (searchResult.success && searchResult.sources.length > 0) {
      searchedWeb = true;
      searchSources = searchResult.sources;
      searchContextDirective = formatSearchContextForPrompt(searchSources, searchDecision.query);
    } else if (searchResult.success && searchResult.sources.length === 0) {
      searchedWeb = true;
      searchContextDirective = `\n\n[AVISO DE PESQUISA: Foi realizada uma pesquisa na internet para "${searchDecision.query}", mas nenhuma fonte utilizável foi localizada. Informe ao usuário com clareza e transparência que a busca online não encontrou referências e responda com base no seu conhecimento prévio caso aplicável, esclarecendo a limitação de atualidade. Não invente fontes ou URLs.]`;
    } else {
      // Chave ausente, cota excedida ou erro de conexão no provedor Tavily
      searchedWeb = false;
      searchContextDirective = `\n\n[AVISO DE PESQUISA: Uma busca na internet sobre "${searchDecision.query}" era necessária para responder com máxima atualidade, porém o serviço de pesquisa está indisponível (${searchResult.error || 'sem conexão'}). Informe educadamente ao usuário em português brasileiro que a pesquisa na web em tempo real está indisponível no momento (${searchResult.error || 'serviço indisponível'}) e por isso suas informações podem não refletir os acontecimentos mais recentes. Não invente notícias ou fatos falsos.]`;
    }
  }

  // Monta o prompt de sistema com as diretrizes de busca se aplicável
  const finalSystemPrompt = searchContextDirective
    ? `${SYSTEM_PROMPT}\n${searchContextDirective}`
    : SYSTEM_PROMPT;

  // Garante a inclusão do prompt de sistema da AURA
  const fullMessages = [
    { role: 'system' as const, content: finalSystemPrompt },
    ...recentMessages.filter((m) => m.role !== 'system'),
  ];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000); // 45 segundos de timeout

    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
        'X-Title': 'AURA Assistant',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openrouter/free',
        messages: fullMessages,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text();
      let errorData: any = null;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        // Resposta não JSON
      }

      const status = openRouterResponse.status;

      if (status === 401) {
        return res.status(401).json({
          error:
            'Chave OPENROUTER_API_KEY inválida ou não autorizada. Verifique sua chave no console do OpenRouter.',
          code: 'UNAUTHORIZED',
        });
      }

      if (status === 429) {
        return res.status(429).json({
          error:
            'Limite de requisições excedido no modelo openrouter/free. Aguarde alguns instantes e tente novamente.',
          code: 'RATE_LIMIT',
        });
      }

      if (status >= 500) {
        return res.status(502).json({
          error:
            'O serviço do OpenRouter está temporariamente indisponível. Tente novamente em instantes.',
          code: 'PROVIDER_ERROR',
        });
      }

      const detailedMsg =
        errorData?.error?.message ||
        errorData?.message ||
        'Falha na comunicação com o OpenRouter.';
      return res.status(status).json({
        error: detailedMsg,
        code: 'OPENROUTER_ERROR',
      });
    }

    const data = await openRouterResponse.json();
    const replyContent = data.choices?.[0]?.message?.content;

    if (!replyContent || typeof replyContent !== 'string' || !replyContent.trim()) {
      return res.status(502).json({
        error:
          'O modelo openrouter/free retornou uma resposta vazia. Tente reformular sua pergunta.',
        code: 'EMPTY_RESPONSE',
      });
    }

    return res.json({
      content: replyContent.trim(),
      model: data.model || 'openrouter/free',
      isReal: true,
      searchedWeb,
      searchQuery: searchDecision.requiresSearch ? searchDecision.query : undefined,
      sources: searchSources,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return res.status(504).json({
        error:
          'Tempo limite esgotado ao aguardar resposta do OpenRouter. O modelo gratuito pode estar com fila alta.',
        code: 'TIMEOUT',
      });
    }

    console.error('Erro ao conectar ao OpenRouter:', err?.message || err);
    return res.status(500).json({
      error: 'Erro interno no servidor ao processar a resposta do OpenRouter.',
      code: 'INTERNAL_ERROR',
    });
  }
});

// Monta o Vite em modo desenvolvimento ou arquivos estáticos em produção
if (!isProduction) {
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[AURA] Servidor ativo em http://0.0.0.0:${PORT}`);
});
