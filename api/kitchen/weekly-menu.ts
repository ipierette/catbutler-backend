import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from '../_lib/cors';
import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Gera um cardápio semanal com café, almoço e jantar para cada dia, evitando repetições
async function gerarCardapioSemanalIA(): Promise<string> {
  if (!groq) throw new Error('GROQ não configurado');
  const prompt = `Você é um chef brasileiro especialista em culinária caseira. Crie um cardápio semanal completo, com sugestões de café da manhã, almoço e jantar para cada dia da semana (segunda a domingo). Não repita receitas. Use pratos típicos brasileiros, práticos e variados. Responda em formato de tabela ou lista clara, em português. Seja criativo, mas realista. Não inclua ingredientes caros ou difíceis de achar. Exemplo de formato:\n\nSEGUNDA:\nCafé: ...\nAlmoço: ...\nJantar: ...\n\nTERÇA:\n...\n\nIMPORTANTE: Cada vez que este comando for chamado, gere um cardápio completamente diferente, mesmo para o mesmo usuário. Nunca repita o cardápio anterior. Seja ainda mais criativo e varie bastante as sugestões a cada chamada.\n\nFinalize com uma mensagem simpática convidando o usuário a compartilhar o cardápio e divulgar o site CatButler!`;
  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: 'Você é um chef IA brasileiro.' },
      { role: 'user', content: prompt }
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 1.0,
    max_tokens: 700,
    top_p: 1,
    stream: false
  });
  return completion.choices[0]?.message?.content || '';
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
    const cardapio = await gerarCardapioSemanalIA();
    res.status(200).json({ success: true, cardapio });
    return;
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao gerar cardápio semanal' });
    return;
  }
};

export default withCors(handler);
