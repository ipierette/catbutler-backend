import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from '../_lib/cors';
import { authenticateUser } from '../_lib/auth';
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;
const gemini = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Cache para evitar gerar dicas repetidas muito rapidamente
const dicasGeradasCache = new Map<string, { dica: string, timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas

// Rate limiting por usuário (máximo 3 dicas por dia)
const userDailyLimits = new Map<string, { count: number, date: string }>();

async function gerarDicaComIA(categoria: string, contexto?: string): Promise<string> {
  if (!groq && !gemini) throw new Error('Nenhum modelo IA configurado');

  const prompts = {
    cozinha: `Você é um chef experiente. Crie UMA dica prática de cozinha em português brasileiro.
    
🔑 REGRAS:
- Máximo 2 frases curtas e claras
- Dica deve ser aplicável imediatamente
- Use ingredientes comuns e acessíveis
- Foque em técnicas básicas mas úteis
${contexto ? `- Relacione com: ${contexto}` : ''}

📋 FORMATO:
Título: [Nome da técnica]
Dica: [Explicação prática em 1-2 frases]

Exemplo:
Título: Cebola sem Lágrimas
Dica: Coloque a cebola na geladeira por 30 minutos antes de cortar. O frio reduz os gases que irritam os olhos.`,

    limpeza: `Você é um especialista em limpeza doméstica. Crie UMA dica prática de limpeza.
    
🔑 REGRAS:
- Use produtos caseiros e acessíveis
- Técnica deve ser segura e eficaz
- Máximo 2 frases explicativas
- Foque em soluções práticas

📋 FORMATO:
Título: [Nome da técnica]
Dica: [Explicação prática]`,

    organização: `Você é um consultor de organização. Crie UMA dica prática de organização doméstica.
    
🔑 REGRAS:
- Solução simples e aplicável
- Não requer produtos caros
- Máximo 2 frases
- Foque em eficiência

📋 FORMATO:
Título: [Nome do método]
Dica: [Explicação prática]`,

    economia: `Você é um consultor financeiro doméstico. Crie UMA dica de economia doméstica.
    
🔑 REGRAS:
- Economia real e mensurável
- Aplicável para qualquer família
- Máximo 2 frases
- Foque em resultados práticos

📋 FORMATO:
Título: [Nome da economia]
Dica: [Explicação prática]`
  };

  const prompt = prompts[categoria as keyof typeof prompts] || prompts.cozinha;

  try {
    if (groq) {
      const completion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: 'Você é um especialista em dicas domésticas práticas e eficazes.' },
          { role: 'user', content: prompt }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 1.1,
        max_tokens: 200,
        top_p: 0.9,
        stream: false
      });
      
      return completion.choices[0]?.message?.content || '';
    } else if (gemini) {
      const model = gemini.getGenerativeModel({ model: 'gemini-pro' });
      const response = await model.generateContent(prompt);
      return response.response.text() || '';
    }
    
    throw new Error('Nenhum modelo disponível');
  } catch (error) {
    console.error('[TIPS AI ERROR]', error);
    throw error;
  }
}

const handler = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }

  try {
    // Autenticar usuário
    const { user, error: authError } = await authenticateUser(req);
    if (authError || !user) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    const { categoria = 'cozinha', contexto } = req.body || {};

    // Rate limiting - máximo 3 dicas por dia por usuário
    const hoje = new Date().toDateString();
    const userLimit = userDailyLimits.get(user.id) || { count: 0, date: '' };
    
    if (userLimit.date === hoje && userLimit.count >= 3) {
      res.status(429).json({ 
        error: 'Limite diário de 3 dicas com IA atingido. Tente novamente amanhã!',
        nextReset: 'amanhã às 00:00'
      });
      return;
    }

    // Verificar cache para evitar gerar dicas muito similares
    const cacheKey = `${categoria}_${contexto || 'geral'}`;
    const dicaCache = dicasGeradasCache.get(cacheKey);
    
    if (dicaCache && (Date.now() - dicaCache.timestamp) < CACHE_DURATION) {
      res.status(200).json({
        success: true,
        dica: dicaCache.dica,
        fonte: 'cache',
        proximaAtualizacao: new Date(dicaCache.timestamp + CACHE_DURATION).toISOString()
      });
      return;
    }

    // Gerar nova dica com IA
    const dicaGerada = await gerarDicaComIA(categoria, contexto);
    
    // Atualizar cache
    dicasGeradasCache.set(cacheKey, {
      dica: dicaGerada,
      timestamp: Date.now()
    });

    // Atualizar rate limiting
    if (userLimit.date === hoje) {
      userLimit.count += 1;
    } else {
      userLimit.count = 1;
      userLimit.date = hoje;
    }
    userDailyLimits.set(user.id, userLimit);

    // Opcional: Salvar dica gerada no Supabase para análise futura
    try {
      await supabase
        .from('dicas_geradas') // Tabela opcional para analytics
        .insert([{
          user_id: user.id,
          categoria,
          contexto,
          dica_gerada: dicaGerada,
          created_at: new Date().toISOString()
        }]);
    } catch (dbError) {
      // Não falhar se não conseguir salvar no banco
      console.warn('Aviso: Não foi possível salvar dica no banco:', dbError);
    }

    res.status(200).json({
      success: true,
      dica: dicaGerada,
      fonte: 'ia',
      categoria,
      limitesRestantes: 3 - userLimit.count,
      proximaAtualizacao: new Date(Date.now() + CACHE_DURATION).toISOString()
    });

  } catch (error) {
    console.error('[TIPS GENERATE ERROR]', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro interno do servidor' 
    });
  }
};

export default withCors(handler);
