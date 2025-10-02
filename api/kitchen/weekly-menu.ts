import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from '../_lib/cors';
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;
const gemini = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Cache em memória para evitar repetições (em produção, usar Redis ou banco)
const cardapioHistorico: string[] = [];
const MAX_HISTORICO = 10; // Mantém últimos 10 cardápios para evitar repetições

// Banco de dados de variedades culinárias para maior diversidade
const VARIEDADES_CULINARIAS = {
  brasileiras: [
    'Nordestina', 'Mineira', 'Gaúcha', 'Paulista', 'Carioca', 'Baiana', 
    'Amazônica', 'Capixaba', 'Goiana', 'Pantaneira', 'Catarinense'
  ],
  internacionais: [
    'Italiana', 'Japonesa', 'Chinesa', 'Mexicana', 'Indiana', 'Tailandesa',
    'Francesa', 'Árabe', 'Peruana', 'Coreana', 'Grega', 'Espanhola',
    'Portuguesa', 'Alemã', 'Americana', 'Argentina', 'Turca', 'Marroquina'
  ],
  estilos: [
    'Caseira', 'Gourmet', 'Rápida', 'Saudável', 'Comfort Food', 'Street Food',
    'Vegetariana', 'Vegana', 'Low Carb', 'Fitness', 'Tradicional', 'Moderna'
  ],
  tecnicas: [
    'Grelhado', 'Assado', 'Refogado', 'Cozido', 'Frito', 'Ensopado',
    'Salteado', 'Marinado', 'Defumado', 'Cru', 'Vapor', 'Braseado'
  ]
};

// Função para gerar seed de variedade baseado no timestamp
function gerarSeedVariedade(): string {
  const now = new Date();
  const seed = now.getTime() + Math.random() * 1000;
  
  const culinariaBr = VARIEDADES_CULINARIAS.brasileiras[Math.floor(seed % VARIEDADES_CULINARIAS.brasileiras.length)];
  const culinariaInt = VARIEDADES_CULINARIAS.internacionais[Math.floor((seed * 2) % VARIEDADES_CULINARIAS.internacionais.length)];
  const estilo = VARIEDADES_CULINARIAS.estilos[Math.floor((seed * 3) % VARIEDADES_CULINARIAS.estilos.length)];
  const tecnica = VARIEDADES_CULINARIAS.tecnicas[Math.floor((seed * 4) % VARIEDADES_CULINARIAS.tecnicas.length)];
  
  return `Foque em: ${culinariaBr}, ${culinariaInt}, estilo ${estilo}, técnica ${tecnica}`;
}


// Função para filtrar pratos inteiros e ingredientes
function filtrarPratosEIngredientes(texto: string, itensProibidos: string[]): string {
  if (!itensProibidos || itensProibidos.length === 0) return texto;
  
  const linhas = texto.split('\n');
  const linhasFiltradas = linhas.filter(linha => {
    const linhaNormalizada = linha.toLowerCase().trim();
    
    // Pula linhas vazias, títulos de dias e emojis
    if (!linhaNormalizada || 
        /^(segunda|terça|quarta|quinta|sexta|sábado|domingo)/i.test(linhaNormalizada) ||
        /^[\u2615\uD83C\uDF72\uD83C\uDF19\uD83E\uDD50\uD83C\uDF7D\uD83E\uDD57]/u.test(linhaNormalizada)) {
      return true;
    }
    
    // Verifica se algum item proibido está presente na linha
    return !itensProibidos.some(item => {
      const itemNormalizado = item.toLowerCase().trim();
      
      // Verifica presença exata do item (ingrediente ou prato)
      return linhaNormalizada.includes(itemNormalizado) ||
             // Verifica variações com acentos e plural
             linhaNormalizada.includes(itemNormalizado.replace(/a$/, 'as')) ||
             linhaNormalizada.includes(itemNormalizado.replace(/o$/, 'os')) ||
             linhaNormalizada.includes(itemNormalizado.replace(/ã$/, 'ães'));
    });
  });
  
  return linhasFiltradas.join('\n');
}

// Gera um cardápio semanal com café, almoço e jantar para cada dia, evitando repetições e ingredientes/pratos proibidos
async function gerarCardapioSemanalIA(ingredientesProibidos?: string[]): Promise<string> {
  if (!gemini && !groq) throw new Error('Nenhum modelo IA configurado');
  
  // Gera seed de variedade para este cardápio
  const seedVariedade = gerarSeedVariedade();
  
  // Prepara histórico de pratos para evitar repetições
  const pratosAnteriores = cardapioHistorico.length > 0 
    ? `\n\n🚫 EVITE ABSOLUTAMENTE estes pratos já sugeridos recentemente: ${cardapioHistorico.join(', ')}`
    : '';
  
  let restricao = '';
  if (ingredientesProibidos && ingredientesProibidos.length > 0) {
    restricao = `\n\n⚠️ RESTRIÇÃO ABSOLUTA: O usuário NÃO quer os seguintes ingredientes OU pratos inteiros: ${ingredientesProibidos.join(', ')}.
    
🔍 REGRAS DE EXCLUSÃO:
- Se for um INGREDIENTE (ex: "peixe", "ovo"): NÃO use em nenhum prato, molho, acompanhamento ou tempero
- Se for um PRATO INTEIRO (ex: "lasanha", "feijoada"): NÃO sugira esse prato nem variações dele
- Se houver dúvida, NÃO sugira o item
- Jamais crie variações disfarçadas dos itens proibidos
- Considere sinônimos e variações (ex: se "peixe" está proibido, não use salmão, bacalhau, etc.)`;
  }
    const prompt = `🍽️ Atue como um chef brasileiro de altíssimo nível, com especialização em culinária caseira, gastronomia regional e internacional.  
Sua missão é criar **um cardápio semanal COMPLETO, EXCLUSIVO e ULTRA-CRIATIVO**, sempre 100% diferente a cada execução, contendo sugestões de café da manhã, almoço e jantar para todos os dias da semana (segunda a domingo).  

🎯 DIRECIONAMENTO DE VARIEDADE: ${seedVariedade}

🔑 REGRAS ESSENCIAIS APRIMORADAS:  
1. **Zero repetição ABSOLUTA**: nunca repita nomes de pratos, receitas, estruturas ou ingredientes principais
2. **Variedade EXTREMA**: use proteínas diferentes (carne bovina, suína, frango, peixe, frutos do mar, ovos, leguminosas, vegetariano, vegano)
3. **Diversidade cultural OBRIGATÓRIA**: 
   - Pelo menos 3 culinárias brasileiras diferentes (Nordestina, Mineira, Gaúcha, etc.)
   - Pelo menos 4 culinárias internacionais (Italiana, Japonesa, Mexicana, Indiana, etc.)
   - Pelo menos 1 prato vegano e 1 vegetariano
4. **Técnicas culinárias variadas**: grelhado, assado, refogado, cozido, frito, ensopado, salteado, marinado
5. **Criatividade INOVADORA**: crie combinações únicas mas realistas, com ingredientes acessíveis
6. **Apresentação DINÂMICA**: varie formato, emojis e estrutura a cada execução
7. **Ingredientes ÚNICOS**: cada dia deve ter ingredientes principais diferentes
8. **Texturas e sabores CONTRASTANTES**: doce/salgado, crocante/cremoso, quente/frio
9. **Sazonalidade**: considere ingredientes da estação atual
10. **Respeite RIGOROSAMENTE** todas as restrições: ${restricao}${pratosAnteriores}
11. **Completude OBRIGATÓRIA**: todos os dias com café, almoço e jantar
12. **Qualidade linguística**: português perfeito, nomes reais, descrições atrativas

🌟 INOVAÇÕES OBRIGATÓRIAS:
- Use especiarias e temperos diferentes a cada prato
- Combine técnicas culinárias inusitadas
- Crie fusões gastronômicas criativas
- Varie tipos de carboidratos (arroz, massas, batatas, quinoa, etc.)
- Inclua pratos de diferentes complexidades (simples, médios, elaborados)

📌 FORMATO DINÂMICO (varie a estrutura):  

SEGUNDA-FEIRA:  
☕ Café da manhã: [Prato único e criativo]
🍲 Almoço: [Combinação inovadora]
🌙 Jantar: [Receita surpreendente]

[Continue com criatividade máxima para todos os dias]

⚡ Este cardápio deve ser **COMPLETAMENTE INÉDITO**, com zero similaridade com cardápios anteriores!

Finalize com uma mensagem calorosa, simpática e envolvente, convidando o usuário a compartilhar seu cardápio e divulgar o site **CatButler!** 🐾`;

  // Prompt para Gemini será construído dinamicamente se necessário

  let resultado = '';
  
  if (groq) {
    // Parte 1: Segunda a Quarta com controle de qualidade
    const promptParte1 = `🍽️ Você é um chef brasileiro experiente e criativo. Crie um cardápio para SEGUNDA, TERÇA e QUARTA-FEIRA.

🎯 DIRECIONAMENTO: ${seedVariedade}

🔑 REGRAS ESSENCIAIS:
1. **Português perfeito**: Use apenas nomes reais de pratos, sem inventar palavras
2. **Pratos autênticos**: Cada prato deve existir e ser preparável
3. **Variedade cultural**: Use 3 culinárias diferentes (brasileira + 2 internacionais)
4. **Zero repetição**: Ingredientes principais diferentes em cada refeição
5. **Formato limpo**: Use estrutura clara e organizada
6. **Restrições**: ${restricao || 'Nenhuma restrição específica'}
7. **Evitar**: ${pratosAnteriores || 'Primeira geração'}

📋 FORMATO OBRIGATÓRIO:
**SEGUNDA-FEIRA:**
☕ Café da manhã: [Nome do prato] - [Breve descrição]
🍲 Almoço: [Nome do prato] - [Breve descrição] 
🌙 Jantar: [Nome do prato] - [Breve descrição]

**TERÇA-FEIRA:**
☕ Café da manhã: [Nome do prato] - [Breve descrição]
🍲 Almoço: [Nome do prato] - [Breve descrição]
🌙 Jantar: [Nome do prato] - [Breve descrição]

**QUARTA-FEIRA:**
☕ Café da manhã: [Nome do prato] - [Breve descrição]
🍲 Almoço: [Nome do prato] - [Breve descrição]
🌙 Jantar: [Nome do prato] - [Breve descrição]

⚠️ IMPORTANTE: Gere APENAS os 3 primeiros dias. NÃO gere quinta a domingo nem mensagem final.`;

    const completion1 = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'Você é um chef brasileiro profissional com expertise em culinária nacional e internacional. Priorize qualidade, autenticidade e clareza na comunicação.' },
        { role: 'user', content: promptParte1 }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 1.8, // Reduzido para melhor qualidade
      max_tokens: 1000,
      top_p: 0.9,
      stream: false
    });
    const resultado1 = completion1.choices[0]?.message?.content || '';

    // Parte 2: Quinta a Domingo + encerramento
    // Extrai pratos já sugeridos para evitar duplicatas (sistema aprimorado)
    const pratosExtraidos = extrairPratosDoTexto(resultado1);
    const avoidList = pratosExtraidos.length > 0 
      ? `\n🚫 PRATOS JÁ USADOS (NÃO REPITA): ${pratosExtraidos.join(', ')}`
      : '';
    
    const promptParte2 = `🍽️ Continue o cardápio semanal para QUINTA, SEXTA, SÁBADO e DOMINGO.

🎯 NOVO DIRECIONAMENTO: ${gerarSeedVariedade()} (diferente da primeira parte)

🔑 REGRAS PARA CONTINUAÇÃO:
1. **Português impecável**: Nomes corretos, sem erros ou invenções
2. **Pratos reais**: Apenas receitas que existem e são conhecidas
3. **Diversidade máxima**: Use culinárias DIFERENTES da primeira parte
4. **Zero repetição**: ${avoidList}
5. **Restrições**: ${restricao || 'Nenhuma restrição específica'}
6. **Ingredientes únicos**: Não repita proteínas ou carboidratos principais
7. **Técnicas variadas**: Use métodos de preparo diferentes

📋 FORMATO OBRIGATÓRIO:
**QUINTA-FEIRA:**
☕ Café da manhã: [Nome do prato] - [Breve descrição]
🍲 Almoço: [Nome do prato] - [Breve descrição]
🌙 Jantar: [Nome do prato] - [Breve descrição]

**SEXTA-FEIRA:**
☕ Café da manhã: [Nome do prato] - [Breve descrição]
🍲 Almoço: [Nome do prato] - [Breve descrição]
🌙 Jantar: [Nome do prato] - [Breve descrição]

**SÁBADO:**
☕ Café da manhã: [Nome do prato] - [Breve descrição]
🍲 Almoço: [Nome do prato] - [Breve descrição]
🌙 Jantar: [Nome do prato] - [Breve descrição]

**DOMINGO:**
☕ Café da manhã: [Nome do prato] - [Breve descrição]
🍲 Almoço: [Nome do prato] - [Breve descrição]
🌙 Jantar: [Nome do prato] - [Breve descrição]

🐾 Finalize com: "Bom apetite! Compartilhe seu cardápio e divulgue o CatButler! 🐾"`;

    const completion2 = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'Você é um chef brasileiro experiente, especialista em evitar repetições e manter alta qualidade linguística. Foque em pratos autênticos e descrições claras.' },
        { role: 'user', content: promptParte2 }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 1.8, // Mesma temperature para consistência
      max_tokens: 1200,
      top_p: 0.9,
      stream: false
    });
    const resultado2 = completion2.choices[0]?.message?.content || '';
    
    // Combina e valida os resultados
    resultado = combinarEValidarResultados(resultado1, resultado2);
    
  } else if (gemini) {
    // Fallback para Gemini com prompt aprimorado
    const model = gemini.getGenerativeModel({ model: 'gemini-pro' });
    const response = await model.generateContent(`${prompt}\n\n${seedVariedade}`);
    resultado = response.response.text() || '';
  }

  // Pós-processamento aprimorado: filtra ingredientes E pratos inteiros
  if (ingredientesProibidos && ingredientesProibidos.length > 0) {
    resultado = filtrarPratosEIngredientes(resultado, ingredientesProibidos);
  }

  // Adiciona ao histórico para evitar repetições futuras
  const novosProtos = extrairPratosDoTexto(resultado);
  cardapioHistorico.push(...novosProtos.slice(0, 5)); // Adiciona até 5 pratos principais
  
  // Mantém apenas os últimos cardápios no histórico
  if (cardapioHistorico.length > MAX_HISTORICO * 5) {
    cardapioHistorico.splice(0, cardapioHistorico.length - MAX_HISTORICO * 5);
  }

  return resultado;
}

// Função auxiliar para extrair pratos do texto gerado
function extrairPratosDoTexto(texto: string): string[] {
  const pratos: string[] = [];
  const linhas = texto.split('\n');
  
  linhas.forEach(linha => {
    // Procura por linhas que contenham pratos (após os dois pontos)
    const regex = /(?:☕|🍲|🌙|Café|Almoço|Jantar).*?:\s*(.+)/i;
    const match = regex.exec(linha);
    if (match?.[1]) {
      const prato = match[1].trim().toLowerCase();
      // Remove descrições extras e pega apenas o nome do prato
      const nomeSimples = prato.split(/[,\-()]/)[0].trim();
      if (nomeSimples.length > 3) {
        pratos.push(nomeSimples);
      }
    }
  });
  
  return [...new Set(pratos)]; // Remove duplicatas
}

// Função para validar e combinar resultados das duas partes
function combinarEValidarResultados(parte1: string, parte2: string): string {
  // Remove linhas problemáticas (com caracteres estranhos, repetições excessivas, etc.)
  const limparTexto = (texto: string): string => {
    return texto
      .split('\n')
      .filter(linha => {
        const linhaNormalizada = linha.trim().toLowerCase();
        
        // Remove linhas vazias ou muito curtas
        if (linhaNormalizada.length < 3) return false;
        
        // Remove linhas com muitos caracteres repetidos (ex: "e e e e e")
        if (/(.)\1{4,}/.test(linhaNormalizada)) return false;
        
        // Remove linhas com muitas aspas ou underscores
        if ((linha.match(/"/g) || []).length > 4) return false;
        if ((linha.match(/_/g) || []).length > 3) return false;
        
        // Remove linhas que parecem corrompidas
        if (/["_]{3,}/.test(linha)) return false;
        
        return true;
      })
      .join('\n');
  };
  
  const parte1Limpa = limparTexto(parte1);
  const parte2Limpa = limparTexto(parte2);
  
  // Combina as partes com separação clara
  return `${parte1Limpa}\n\n${parte2Limpa}`.trim();
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
