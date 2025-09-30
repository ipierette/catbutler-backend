import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from '../_lib/cors';
import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);


// Gera um cardápio semanal com café, almoço e jantar para cada dia, evitando repetições e ingredientes proibidos
async function gerarCardapioSemanalIA(ingredientesProibidos?: string[]): Promise<string> {
  if (!groq) throw new Error('GROQ não configurado');
  let restricao = '';
  if (ingredientesProibidos && ingredientesProibidos.length > 0) {
    restricao = `\n\nATENÇÃO: O usuário NÃO gosta dos seguintes ingredientes e não pode sugerir nenhum prato que contenha: ${ingredientesProibidos.join(', ')}. Exclua absolutamente qualquer prato que leve esses ingredientes, mesmo como tempero, acompanhamento ou parte do nome do prato. Se não tiver certeza, NÃO sugira. NÃO repita pratos nem variações. Se sugerir algum prato proibido, será penalizado.`;
  }
  const prompt = `Você é um chef brasileiro especialista em culinária caseira. Crie um cardápio semanal COMPLETAMENTE DIFERENTE a cada chamada, com sugestões de café da manhã, almoço e jantar para cada dia da semana (segunda a domingo). NÃO repita receitas, nomes de pratos, nem estruturas. Use pratos típicos brasileiros, regionais, internacionais, práticos e variados. Responda em formato de tabela ou lista clara, em português. Seja criativo, mas realista. Não inclua ingredientes caros ou difíceis de achar. Exemplo de formato:\n\nSEGUNDA:\nCafé: ...\nAlmoço: ...\nJantar: ...\n\nTERÇA:\n...\n\nIMPORTANTE: Cada vez que este comando for chamado, gere um cardápio TOTALMENTE diferente, mesmo para o mesmo usuário. Varie bastante os tipos de proteína (carne, peixe, frango, ovos, vegetariano, vegano), inclua pratos regionais, internacionais e pelo menos um prato vegano na semana. NÃO repita a estrutura dos dias. Seja ainda mais criativo e varie bastante as sugestões a cada chamada. NÃO repita pratos nem ingredientes principais. ${restricao}\n\nFinalize com uma mensagem simpática convidando o usuário a compartilhar o cardápio e divulgar o site CatButler!`;
  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: 'Você é um chef IA brasileiro.' },
      { role: 'user', content: prompt }
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 1.2,
    max_tokens: 700,
    top_p: 1.0,
    stream: false
  });
  let resultado = completion.choices[0]?.message?.content || '';
  // Pós-processamento: remove linhas com ingredientes proibidos (caso a IA ignore)
  if (ingredientesProibidos && ingredientesProibidos.length > 0) {
    const proibidosRegex = new RegExp(ingredientesProibidos.map(i => i.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i');
    resultado = resultado.split('\n').filter(linha => !proibidosRegex.test(linha)).join('\n');
  }
  return resultado;
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
    // Permite receber ingredientesProibidos no body (JSON)
    let ingredientesProibidos: string[] | undefined = undefined;
    if (req.body && typeof req.body === 'object') {
      if (Array.isArray(req.body.ingredientesProibidos)) {
        ingredientesProibidos = req.body.ingredientesProibidos.map((i: any) => String(i)).filter(Boolean);
      }
    }
    const cardapio = await gerarCardapioSemanalIA(ingredientesProibidos);
    res.status(200).json({ success: true, cardapio });
    return;
  } catch (error) {
    console.error('[WEEKLY MENU ERROR]', error);
    res.status(500).json({ success: false, error: (error instanceof Error ? error.message : String(error)) });
    return;
  }
};

export default withCors(handler);
