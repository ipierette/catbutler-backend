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
    restricao = `\n\n⚠️ RESTRIÇÃO ABSOLUTA: O usuário NÃO gosta dos seguintes ingredientes e NUNCA pode aparecer nenhum prato, acompanhamento, molho, tempero ou referência que contenha: ${ingredientesProibidos.join(', ')}.  
Se houver dúvida sobre a presença de algum ingrediente proibido, NÃO sugira o prato.  
Jamais repita pratos nem crie variações disfarçadas.  
Se algum item proibido for sugerido, será considerado erro grave.`;
  }
  const prompt = `🍽️ Atue como um chef brasileiro de altíssimo nível, com especialização em culinária caseira, gastronomia regional e internacional.  
Sua missão é criar **um cardápio semanal COMPLETO, EXCLUSIVO e CRIATIVO**, sempre 100% diferente a cada execução, contendo sugestões de café da manhã, almoço e jantar para todos os dias da semana (segunda a domingo).  

🔑 REGRAS ESSENCIAIS:  
1. **Zero repetição**: nunca repita nomes de pratos, receitas ou estruturas.  
2. **Variedade máxima**: use proteínas diferentes (carne, frango, peixe, ovos, frutos do mar, vegetariano, vegano).  
3. **Inclusão obrigatória**: pelo menos um prato vegano na semana.  
4. **Mistura cultural**: inclua pratos típicos brasileiros (de várias regiões), internacionais, simples e práticos.  
5. **Criatividade realista**: crie pratos originais, mas fáceis de preparar, com ingredientes comuns e acessíveis (evite itens caros ou difíceis de encontrar).  
6. **Apresentação clara**: organize em tabela ou lista bem formatada, em português do Brasil, destacando cada dia.  
7. **Estrutura flexível**: varie a ordem, estilo de apresentação e formas de listar os pratos a cada nova chamada.  
8. **Não repita ingredientes principais** ao longo da semana.  
9. **Respeite todas as restrições alimentares** informadas. ${restricao}  

📌 EXEMPLO DE FORMATAÇÃO (apenas ilustrativo, não repita exatamente):  

SEGUNDA:  
☕ Café da manhã: …  
🍲 Almoço: …  
🌙 Jantar: …  

TERÇA:  
☕ Café da manhã: …  
🍲 Almoço: …  
🌙 Jantar: …  

⚡ Cada execução deste comando deve gerar um cardápio **TOTALMENTE inédito**, com pratos e descrições variadas, surpreendendo sempre o usuário.  

Finalize com uma mensagem calorosa, simpática e envolvente, convidando o usuário a compartilhar seu cardápio e divulgar o site **CatButler!** 🐾`;

  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: 'Você é um chef IA brasileiro criativo, inovador e especialista em culinária variada.' },
      { role: 'user', content: prompt }
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 2.0,
    max_tokens: 900,
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
