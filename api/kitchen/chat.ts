import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from '../_lib/cors';
import Groq from 'groq-sdk';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
// Helpers do suggestions
import { traduzirTituloReceita, traduzirParaPortugues, traduzirIngredientesOtimizado } from '../kitchen/suggestions';

// Configuração das APIs
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const THEMEALDB_BASE_URL = 'https://www.themealdb.com/api/json/v1/1';
// Função para buscar, traduzir e salvar receitas do TheMealDB
type Receita = {
  id?: string;
  external_id?: string;
  nome: string;
  categoria?: string;
  origem?: string;
  instrucoes: string;
  ingredientes: string[];
  tempo_estimado?: string;
  dificuldade?: string;
  imagem_url?: string;
  fonte_url?: string;
  fonte?: string;
  ativo?: boolean;
  verificado?: boolean;
};

function contemIngles(texto: string): boolean {
  // Simplificado: busca palavras-chave mais comuns
  return /\b(the|and|chicken|beef|instructions|ingredients|add|cook|bake|oven|minutes|salt|pepper|oil|water|milk|egg|sugar|flour|butter|onion|garlic|cheese|cream|meat|fish|rice|pasta|sauce|serve|pan|boil|fry|grill|roast|slice|chop|pour|stir|heat|let|cool|until|ready|dish|plate|garnish|enjoy)\b/i.test(texto);
}

async function buscarTraduzirSalvarReceitas(ingredientes: string[]): Promise<Receita[]> {
  const receitas: Receita[] = [];

  // 1. Buscar receitas no próprio banco que contenham os ingredientes
  for (const ingrediente of ingredientes) {
    try {
      const { data: receitasBanco, error } = await supabase
        .from('receitas')
        .select('*')
        .ilike('ingredientes', `%${ingrediente}%`);
      if (error) throw error;
      if (receitasBanco && receitasBanco.length > 0) {
        for (const receita of receitasBanco as Receita[]) {
          const texto = (receita.nome || '') + ' ' + (receita.instrucoes || '');
          if (contemIngles(texto)) {
            try {
              const nome = await traduzirTituloReceita(receita.nome);
              const instrucoes = await traduzirParaPortugues(receita.instrucoes);
              const categoria = receita.categoria ? await traduzirParaPortugues(receita.categoria) : undefined;
              const origem = receita.origem ? await traduzirParaPortugues(receita.origem) : undefined;
              const ingredientesPT = await traduzirIngredientesOtimizado(receita.ingredientes || []);
              await supabase.from('receitas').delete().eq('id', receita.id);
              const receitaTraduzida: Receita = {
                ...receita,
                nome,
                instrucoes,
                categoria,
                origem,
                ingredientes: ingredientesPT,
                external_id: receita.external_id ? receita.external_id.replace('-en', '-pt') : undefined
              };
              await supabase.from('receitas').insert(receitaTraduzida);
              receitas.push(receitaTraduzida);
            } catch (traducaoErr) {
              // Se falhar tradução, ignora e não insere
              continue;
            }
          } else {
            receitas.push(receita);
          }
        }
      }
    } catch (err) {
      // Ignora erro e segue para próxima fonte
      continue;
    }
  }

  // 2. Buscar receitas externas (TheMealDB) se não houver suficientes
  if (receitas.length < 2) {
    for (const ingrediente of ingredientes) {
      let meals: any[] | null = null;
      try {
        const response = await axios.get(`${THEMEALDB_BASE_URL}/filter.php?i=${encodeURIComponent(ingrediente)}`);
        meals = response.data.meals;
      } catch (err) {
        continue;
      }
      if (!meals || meals.length === 0) continue;
      for (const meal of meals.slice(0, 2)) {
        let mealDetail: any = null;
        try {
          const detailResp = await axios.get(`${THEMEALDB_BASE_URL}/lookup.php?i=${meal.idMeal}`);
          mealDetail = detailResp.data.meals?.[0];
        } catch (err) {
          continue;
        }
        if (!mealDetail) continue;
        try {
          const nome = await traduzirTituloReceita(mealDetail.strMeal);
          const instrucoes = await traduzirParaPortugues(mealDetail.strInstructions);
          const categoria = mealDetail.strCategory ? await traduzirParaPortugues(mealDetail.strCategory) : undefined;
          const origem = mealDetail.strArea ? await traduzirParaPortugues(mealDetail.strArea) : undefined;
          const ingredientesArr: string[] = [];
          for (let i = 1; i <= 20; i++) {
            const ing = mealDetail[`strIngredient${i}`]?.trim();
            const med = mealDetail[`strMeasure${i}`]?.trim();
            if (ing) ingredientesArr.push(med ? `${med} ${ing}` : ing);
          }
          const ingredientesPT = await traduzirIngredientesOtimizado(ingredientesArr);
          let tempo_estimado = '30min';
          if (ingredientesArr.length > 10) tempo_estimado = '1h';
          else if (ingredientesArr.length > 5) tempo_estimado = '45min';
          let dificuldade = 'Fácil';
          if (ingredientesArr.length > 12) dificuldade = 'Difícil';
          else if (ingredientesArr.length > 7) dificuldade = 'Médio';
          const receita: Receita = {
            external_id: `themealdb-${mealDetail.idMeal}`,
            nome,
            categoria,
            origem,
            instrucoes,
            ingredientes: ingredientesPT,
            tempo_estimado,
            dificuldade,
            imagem_url: mealDetail.strMealThumb || '',
            fonte_url: `https://www.themealdb.com/meal/${mealDetail.idMeal}`,
            fonte: 'themealdb',
            ativo: true,
            verificado: true
          };
          try {
            const { data: existente } = await supabase
              .from('receitas')
              .select('id')
              .eq('external_id', receita.external_id)
              .single();
            if (!existente) {
              await supabase.from('receitas').insert(receita);
            }
          } catch (saveErr) {
            // Ignora erro de salvamento
          }
          receitas.push(receita);
        } catch (traducaoErr) {
          // Ignora erro de tradução
          continue;
        }
      }
    }
  }
  return receitas;
}

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

// Prompts predefinidos para diferentes contextos - Versão 2.0
const SYSTEM_PROMPTS = {
  chef: `Você é o Chef Bruno, um chef brasileiro especializado em culinária caseira, prática e regional.

PERSONALIDADE:
- Amigável, experiente e didático
- Conhece profundamente a culinária brasileira
- Adapta receitas para ingredientes locais
- Foca em praticidade e economia

DIRETRIZES DE RESPOSTA:
1. SEMPRE responda em português brasileiro natural
2. Seja específico e detalhado nas instruções
3. Use medidas caseiras (xícara, colher, pitada)
4. Inclua tempo real de preparo e cozimento
5. Dê dicas profissionais práticas
6. Sugira variações regionais quando relevante

FORMATO PARA RECEITAS:
📝 Nome da Receita
⏱️ Tempo: X minutos
👥 Serve: X pessoas
💰 Custo: Baixo/Médio/Alto

🛒 INGREDIENTES:
- Liste com quantidades exatas
- Use medidas caseiras
- Indique alternativas quando possível

👨‍🍳 MODO DE PREPARO:
1. Passo a passo detalhado
2. Dicas de técnica
3. Sinais visuais de pronto

💡 DICAS DO CHEF:
- Truques profissionais
- Como armazenar
- Variações possíveis

Seja sempre específico, nunca genérico!`,

  ingredientes: `Você é o Chef Bruno analisando os ingredientes disponíveis.

TAREFA: Criar receitas específicas usando PRINCIPALMENTE os ingredientes listados.

REGRAS:
1. Use PELO MENOS 70% dos ingredientes fornecidos
2. Sugira 2-3 receitas diferentes
3. Indique quais ingredientes extras são necessários
4. Priorize receitas brasileiras ou adaptadas ao paladar brasileiro
5. Seja específico com quantidades e técnicas

FORMATO:
🍽️ RECEITA 1: [Nome]
✅ Usa: [ingredientes da lista]
➕ Precisa: [ingredientes extras mínimos]
⏱️ [tempo específico]

[receita detalhada]

---

Continue para mais receitas...`,

  substituicoes: `Você é o Chef Bruno especialista em substituições culinárias.

ANÁLISE DE SUBSTITUIÇÕES:
1. Identifique o ingrediente a substituir
2. Explique sua função na receita
3. Liste 3 alternativas viáveis
4. Indique proporções EXATAS
5. Avise sobre mudanças de sabor/textura
6. Dê dica profissional para melhor resultado

Seja específico com medidas e técnicas!`
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
    const { 
      mensagem, 
      ingredientes, 
      contextoConversa, 
      isVisitorMode = false 
    }: ChatRequest = req.body;

    if (!mensagem || typeof mensagem !== 'string' || mensagem.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Mensagem é obrigatória'
      });
      return;
    }

    console.log('💬 Nova mensagem para Chef IA:', mensagem);
    console.log('[Chat] Ingredientes recebidos:', ingredientes);
    console.log('[Chat] Contexto da conversa:', contextoConversa);

    // Verificar limites para visitantes
    if (isVisitorMode) {
      const mensagensUsadas = contextoConversa?.filter(msg => msg.tipo === 'usuario').length || 0;
      const LIMITE_VISITANTE = 4;
      
      if (mensagensUsadas >= LIMITE_VISITANTE) {
        res.status(429).json({
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
        return;
      }
    }


    // Determinar contexto e construir prompt
    const contexto = determinarContexto(mensagem, ingredientes);
    const prompt = construirPrompt(mensagem, contexto, ingredientes, contextoConversa);

    // Gerar resposta da IA
    const respostaIA = await gerarRespostaIA(prompt);
    console.log('[Chat] Prompt enviado para IA:', prompt);
    console.log('[Chat] Resposta da IA:', respostaIA);

    // Se a mensagem pedir receita ou ingredientes, buscar receitas externas, traduzir e salvar
    let receitasExternas: any[] = [];
    if (contexto === 'ingredientes' && ingredientes && ingredientes.length > 0) {
      receitasExternas = await buscarTraduzirSalvarReceitas(ingredientes.slice(0, 2)); // Limitar para não esgotar cota
    }

    // Gerar sugestões complementares
    const sugestoes = gerarSugestoes(mensagem, ingredientes);

    const response: ChatResponse & { receitasExternas?: any[] } = {
      success: true,
      data: {
        resposta: respostaIA,
        timestamp: Date.now(),
        sugestoes
      },
      receitasExternas: receitasExternas.length > 0 ? receitasExternas : undefined
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
    res.status(200).json(response);
    return;

  } catch (error) {
    console.error('❌ Erro na API de chat:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      data: {
        resposta: 'Desculpe, ocorreu um erro temporário. Tente novamente em alguns momentos.',
        timestamp: Date.now()
      }
    });
    return;
  }
}

export default withCors(handler);