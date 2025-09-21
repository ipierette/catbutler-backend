import type { VercelRequest, VercelResponse } from '@vercel/node';
import Groq from 'groq-sdk';

// Configuração da API Groq
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

interface ChatMessage {
  tipo: 'usuario' | 'ia';
  mensagem: string;
  timestamp: number;
}

interface ChatRequest {
  mensagem: string;
  ingredientes?: string[];
  contextoConversa?: ChatMessage[];
  isVisitorMode?: boolean;
}

interface ChatResponse {
  success: boolean;
  data: {
    resposta: string;
    timestamp: number;
    sugestoes?: string[];
    limitesVisitante?: {
      mensagensUsadas: number;
      limiteTotal: number;
    };
  };
  error?: string;
}

// Prompts predefinidos para diferentes contextos
const SYSTEM_PROMPTS = {
  chef: `Você é um Chef IA especialista em culinária brasileira e internacional. 
Suas características:
- Experiente e criativo na cozinha
- Conhece receitas tradicionais e modernas
- Dá dicas práticas e acessíveis
- É amigável e encorajador
- Foca em ingredientes disponíveis no Brasil
- Sugere substituições quando necessário

Responda sempre em português brasileiro, seja prestativo e didático.`,

  ingredientes: `Como Chef IA, analise os ingredientes fornecidos e:
1. Sugira receitas práticas e saborosas
2. Indique tempo de preparo realista
3. Dê dicas de preparo e armazenamento
4. Sugira acompanhamentos
5. Mencione variações possíveis

Mantenha as sugestões acessíveis e práticas para o dia a dia.`,

  substituicoes: `Como Chef IA especialista, ajude com substituições de ingredientes:
- Sugira alternativas comuns e acessíveis
- Explique como a substituição afeta o sabor/textura
- Indique proporções corretas
- Dê dicas para melhor resultado`
};

// Função para determinar o contexto da mensagem
function determinarContexto(mensagem: string, ingredientes?: string[]): string {
  const mensagemLower = mensagem.toLowerCase();
  
  if (ingredientes && ingredientes.length > 0) {
    return 'ingredientes';
  }
  
  if (mensagemLower.includes('substituir') || 
      mensagemLower.includes('trocar') || 
      mensagemLower.includes('substituto')) {
    return 'substituicoes';
  }
  
  return 'chef';
}

// Função para construir o prompt completo
function construirPrompt(
  mensagem: string, 
  contexto: string, 
  ingredientes?: string[], 
  historico?: ChatMessage[]
): string {
  let prompt = SYSTEM_PROMPTS[contexto as keyof typeof SYSTEM_PROMPTS];
  
  // Adicionar contexto de ingredientes se disponível
  if (ingredientes && ingredientes.length > 0) {
    prompt += `\n\nIngredientes disponíveis: ${ingredientes.join(', ')}`;
  }
  
  // Adicionar histórico da conversa (últimas 3 mensagens)
  if (historico && historico.length > 0) {
    const historicoRecente = historico.slice(-3);
    prompt += '\n\nHistórico da conversa:\n';
    historicoRecente.forEach(msg => {
      prompt += `${msg.tipo === 'usuario' ? 'Usuário' : 'Chef'}: ${msg.mensagem}\n`;
    });
  }
  
  prompt += `\n\nUsuário: ${mensagem}\nChef IA:`;
  
  return prompt;
}


// Função para gerar resposta usando apenas GROQ (OpenAI-compatible)
async function gerarRespostaIA(prompt: string): Promise<string> {
  try {
    if (!groq) throw new Error('GROQ não configurado');
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `Você é um Chef IA especialista em culinária brasileira e internacional. 
Suas características:
- Experiente e criativo na cozinha
- Conhece receitas tradicionais e modernas
- Dá dicas práticas e acessíveis
- É amigável e encorajador
- Foca em ingredientes disponíveis no Brasil
- Sugere substituições quando necessário

Responda sempre em português brasileiro, seja prestativo e didático. Mantenha respostas concisas (máximo 150 palavras).`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'llama3-8b-8192',
      temperature: 0.7,
      max_tokens: 200,
      top_p: 1,
      stream: false
    });
    const resposta = completion.choices[0]?.message?.content || '';
    if (!resposta || resposta.length < 20) {
      throw new Error('Resposta muito curta ou vazia do GROQ');
    }
    console.log('✅ Resposta gerada com GROQ');
    return resposta.trim();
  } catch (error) {
    console.error('Erro ao gerar resposta IA:', error);
    return gerarRespostaPadrao(prompt);
  }
}

// Função para gerar resposta padrão quando IA falha
function gerarRespostaPadrao(prompt: string): string {
  if (prompt.toLowerCase().includes('receita')) {
    return 'Que ingredientes você tem disponíveis? Posso sugerir algumas receitas deliciosas baseadas no que você tem em casa!';
  }
  
  if (prompt.toLowerCase().includes('ingrediente')) {
    return 'Vamos cozinhar algo especial! Me conte quais ingredientes você tem e eu vou te ajudar a criar uma refeição incrível.';
  }
  
  return 'Como Chef IA, estou aqui para te ajudar na cozinha! Me conte o que você gostaria de cozinhar ou quais ingredientes você tem disponível.';
}

// Função para gerar sugestões complementares
function gerarSugestoes(mensagem: string, ingredientes?: string[]): string[] {
  const sugestoes: string[] = [];
  const mensagemLower = mensagem.toLowerCase();
  
  if (ingredientes && ingredientes.length > 0) {
    sugestoes.push(
      `Como conservar ${ingredientes[0]}?`,
      `Outras receitas com ${ingredientes.slice(0, 2).join(' e ')}`,
      'Dicas de temperos para essa receita'
    );
  }
  
  if (mensagemLower.includes('receita')) {
    sugestoes.push(
      'Qual o tempo de preparo?',
      'Posso substituir algum ingrediente?',
      'Como servir essa receita?'
    );
  }
  
  // Sugestões genéricas
  if (sugestoes.length === 0) {
    sugestoes.push(
      'Me ajude a criar um cardápio semanal',
      'Quais temperos combinam bem juntos?',
      'Receitas rápidas para o dia a dia'
    );
  }
  
  return sugestoes.slice(0, 3);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configurar CORS
  // CORS: Permitir apenas a URL do frontend de produção
  const allowedOrigin = process.env.FRONTEND_URL || 'https://catbutler-frontend.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { 
      mensagem, 
      ingredientes, 
      contextoConversa, 
      isVisitorMode = false 
    }: ChatRequest = req.body;

    if (!mensagem || typeof mensagem !== 'string' || mensagem.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Mensagem é obrigatória'
      });
    }

    console.log('💬 Nova mensagem para Chef IA:', mensagem);

    // Verificar limites para visitantes
    if (isVisitorMode) {
      const mensagensUsadas = contextoConversa?.filter(msg => msg.tipo === 'usuario').length || 0;
      const LIMITE_VISITANTE = 4;
      
      if (mensagensUsadas >= LIMITE_VISITANTE) {
        return res.status(429).json({
          success: false,
          error: 'Limite de mensagens atingido',
          data: {
            resposta: 'Você atingiu o limite de 4 mensagens mensais como visitante. Crie uma conta gratuita para conversas ilimitadas!',
            timestamp: Date.now(),
            limitesVisitante: {
              mensagensUsadas: LIMITE_VISITANTE,
              limiteTotal: LIMITE_VISITANTE
            }
          }
        });
      }
    }

    // Determinar contexto e construir prompt
    const contexto = determinarContexto(mensagem, ingredientes);
    const prompt = construirPrompt(mensagem, contexto, ingredientes, contextoConversa);

    // Gerar resposta da IA
    const respostaIA = await gerarRespostaIA(prompt);
    
    // Gerar sugestões complementares
    const sugestoes = gerarSugestoes(mensagem, ingredientes);

    const response: ChatResponse = {
      success: true,
      data: {
        resposta: respostaIA,
        timestamp: Date.now(),
        sugestoes
      }
    };

    // Adicionar informações de limite para visitantes
    if (isVisitorMode) {
      const mensagensUsadas = (contextoConversa?.filter(msg => msg.tipo === 'usuario').length || 0) + 1;
      response.data.limitesVisitante = {
        mensagensUsadas,
        limiteTotal: 4
      };
    }

    console.log('✅ Resposta gerada com sucesso');
    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ Erro na API de chat:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      data: {
        resposta: 'Desculpe, ocorreu um erro temporário. Tente novamente em alguns momentos.',
        timestamp: Date.now()
      }
    });
  }
}