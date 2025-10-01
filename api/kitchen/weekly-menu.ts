import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from '../_lib/cors';
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;
const gemini = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);


// Gera um cardápio semanal com café, almoço e jantar para cada dia, evitando repetições e ingredientes proibidos
async function gerarCardapioSemanalIA(ingredientesProibidos?: string[]): Promise<string> {
  if (!gemini && !groq) throw new Error('Nenhum modelo IA configurado');
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
  10. **Nunca deixe nenhum dia da semana sem café, almoço e jantar preenchidos. Domingo deve ser sempre completo.**
  11. **Revise cuidadosamente a ortografia e gramática antes de finalizar. Evite erros de português, nomes inventados ou palavras sem sentido.**
  12. **Seja criativo, mas sempre com pratos reais, nomes corretos e descrições claras.**

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

  // Prompt para Gemini: introdução + segunda a quarta
  const promptGemini = `🍽️ Atue como um chef brasileiro de altíssimo nível, com especialização em culinária caseira, gastronomia regional e internacional.\nSua missão é criar a introdução e o cardápio de SEGUNDA a QUARTA, cada dia com café da manhã, almoço e jantar, seguindo as regras abaixo.\n\n🔑 REGRAS ESSENCIAIS:\n1. Zero repetição de pratos ou estruturas.\n2. Variedade máxima de proteínas.\n3. Pelo menos um prato vegano.\n4. Misture pratos brasileiros e internacionais.\n5. Pratos reais, ingredientes acessíveis.\n6. Apresente em português do Brasil, bem formatado.\n7. Não repita ingredientes principais.\n8. Respeite todas as restrições alimentares. ${restricao}\n9. Não deixe nenhum dia sem café, almoço e jantar.\n10. Revise ortografia e gramática.\n11. Seja criativo, mas realista.\n\nExemplo:\nSEGUNDA:\n☕ Café da manhã: ...\n🍲 Almoço: ...\n🌙 Jantar: ...\n\nGere apenas introdução e os dias SEGUNDA, TERÇA e QUARTA. Não gere quinta a domingo nem mensagem final.`;

  // Prompt para Groq: quinta a domingo + encerramento
  const promptGroq = `Continue o cardápio semanal a partir de QUINTA até DOMINGO, cada dia com café da manhã, almoço e jantar, SEM repetir nenhum prato, estrutura ou ingrediente principal já sugerido nos dias anteriores.\nFinalize com uma mensagem calorosa convidando o usuário a compartilhar o cardápio e divulgar o site CatButler!\n\nSiga as mesmas regras do início do cardápio.\n\nExemplo:\nQUINTA:\n☕ Café da manhã: ...\n🍲 Almoço: ...\n🌙 Jantar: ...\n\nGere apenas QUINTA, SEXTA, SÁBADO e DOMINGO + mensagem final.`;

  let resultadoGemini = '';
  let resultadoGroq = '';

  // Gemini: introdução + segunda a quarta
  if (gemini) {
    try {
      const model = gemini.getGenerativeModel({ model: 'gemini-pro' });
      const result = await model.generateContent(promptGemini);
      resultadoGemini = result.response.text();
      if (!resultadoGemini || resultadoGemini.trim().length < 10) {
        resultadoGemini = 'Não foi possível gerar a primeira parte do cardápio com o Gemini gratuito.';
      }
    } catch (err: any) {
      resultadoGemini = 'Limite do Gemini gratuito atingido ou erro na geração da primeira parte.';
    }
  }

  // Groq: quinta a domingo + encerramento
  if (groq) {
    // Passa os pratos já sugeridos para evitar duplicatas
  let pratosGeminiRaw = resultadoGemini.match(/: (.*)/g);
  let pratosGemini: string[] = Array.isArray(pratosGeminiRaw) ? pratosGeminiRaw.map(p => p.replace(/^: /, '').trim().toLowerCase()) : [];
    const avoidList = pratosGemini.length > 0 ? `Evite sugerir qualquer prato, ingrediente ou estrutura já mencionada anteriormente: ${pratosGemini.join(', ')}.` : '';
    const promptGroqFinal = promptGroq + '\n' + avoidList;
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'Você é um chef IA brasileiro criativo, inovador e especialista em culinária variada.' },
        { role: 'user', content: promptGroqFinal }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 1.3,
      max_tokens: 1200,
      top_p: 1.0,
      stream: false
    });
    resultadoGroq = completion.choices[0]?.message?.content || '';
  }

  // Junta as duas partes
  let resultado = (resultadoGemini + '\n' + resultadoGroq).trim();

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
