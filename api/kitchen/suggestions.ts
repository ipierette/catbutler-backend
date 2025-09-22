import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from '../_lib/cors';
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { BancoDadosReceitas } from '../_lib/banco-receitas';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// Configuração das APIs
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// URLs das APIs
const LIBRE_TRANSLATE_URL = 'https://libretranslate.de/translate';
const THEMEALDB_BASE_URL = 'https://www.themealdb.com/api/json/v1/1';

// Mapeamento de ingredientes comuns PT → EN
const INGREDIENTES_COMUNS: Record<string, string> = {
  // Lácteos
  'leite': 'milk',
  'leite condensado': 'condensed milk',
  'creme de leite': 'cream',
  'manteiga': 'butter',
  'queijo': 'cheese',
  'queijo ralado': 'grated cheese',

  // Carnes
  'carne': 'meat',
  'carne bovina': 'beef',
  'carne de boi': 'beef',
  'carne suína': 'pork',
  'frango': 'chicken',
  'peixe': 'fish',
  'camarão': 'shrimp',
  'carne seca': 'dried beef',

  // Grãos e carboidratos
  'arroz': 'rice',
  'feijão': 'beans',
  'farinha': 'flour',
  'farinha de trigo': 'wheat flour',
  'macarrão': 'pasta',
  'pão': 'bread',
  'batata': 'potato',

  // Verduras e legumes
  'cebola': 'onion',
  'alho': 'garlic',
  'tomate': 'tomato',
  'cenoura': 'carrot',
  'alface': 'lettuce',
  'batata doce': 'sweet potato',

  // Frutas
  'banana': 'banana',
  'maçã': 'apple',
  'laranja': 'orange',
  'abacaxi': 'pineapple',

  // Doces e sobremesas
  'chocolate': 'chocolate',
  'chocolate em pó': 'cocoa powder',
  'açúcar': 'sugar',
  'doce de leite': 'dulce de leche',
  'leite em pó': 'powdered milk',

  // Outros
  'ovo': 'egg',
  'ovos': 'eggs',
  'óleo': 'oil',
  'sal': 'salt',
  'pimenta': 'pepper'
};

// Interfaces para o sistema integrado
interface ReceitaSugerida {
  id: string;
  nome: string;
  categoria: string;
  origem: string;
  ingredientes: string[];
  instrucoes: string;
  imagem: string;
  tempoEstimado: string;
  dificuldade: string;
  fonte: 'local' | 'ia' | 'themealdb';
  tipo: string;
  rating: number;
  matchScore?: number;
  dicaEspecial?: string;
  fonte_url?: string;
}

interface MealDBRecipe {
  idMeal: string;
  strMeal: string;
  strCategory: string;
  strArea: string;
  strInstructions: string;
  strMealThumb: string;
  strTags?: string;
  [key: string]: string | undefined;
}

interface MealDBResponse {
  meals: MealDBRecipe[] | null;
}

interface SugestaoResponse {
  success: boolean;
  data: {
    receitas: ReceitaSugerida[];
    ingredientesPesquisados: string[];
    total: number;
    fontes: {
      brasileiras: number;
      ia_criativas: number;
      internacionais: number;
    };
    tempoResposta: number;
    traducao_ativa: boolean;
    receitas_salvas_no_banco: number;
  };
  error?: string;
}

// === FUNÇÕES DE TRADUÇÃO ===

// Traduzir texto português para inglês (para busca no TheMealDB)
async function traduzirParaIngles(texto: string): Promise<string> {
  try {
    console.log(`🔤 Traduzindo PT→EN: "${texto}"`);

    // 1. Primeiro, verificar se é um ingrediente comum mapeado
    const textoLower = texto.toLowerCase();
    if (INGREDIENTES_COMUNS[textoLower]) {
      const traducao = INGREDIENTES_COMUNS[textoLower];
      console.log(`✅ Ingrediente comum mapeado: "${texto}" → "${traducao}"`);
      return traducao;
    }

    // 2. Se não for mapeado, tentar tradução automática
    for (let tentativa = 1; tentativa <= 3; tentativa++) {
      try {
        const response = await axios.post(LIBRE_TRANSLATE_URL, {
          q: texto,
          source: 'pt',
          target: 'en',
          format: 'text'
        }, {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const textoTraduzido = response.data.translatedText || response.data.result || texto;
        console.log(`🔤 Tradução automática PT→EN: "${texto}" → "${textoTraduzido}"`);
        return textoTraduzido;

      } catch (retryError) {
        console.warn(`⚠️ Tentativa ${tentativa} falhou:`, (retryError as Error).message);
        if (tentativa === 3) throw retryError;
        await new Promise(resolve => setTimeout(resolve, 1000 * tentativa)); // Backoff
      }
    }

    return texto;

  } catch (error) {
    console.warn('⚠️ Erro na tradução PT→EN, tentando buscar com termo original:', (error as Error).message);

    // Se tradução falhar completamente, tentar buscar com termo em português
    // pois alguns ingredientes como "chocolate", "arroz" são universais
    console.log(`🔍 Tentando buscar no TheMealDB com termo original: "${texto}"`);
    return texto;
  }
}

// Traduzir texto inglês para português (para respostas do TheMealDB) - OTIMIZADO
async function traduzirParaPortugues(texto: string): Promise<string> {
  try {
    // Se for texto curto, tentar tradução automática com retry (sem logs individuais)
    if (texto.length < 100) {
      for (let tentativa = 1; tentativa <= 2; tentativa++) {
        try {
          const response = await axios.post(LIBRE_TRANSLATE_URL, {
            q: texto,
            source: 'en',
            target: 'pt',
            format: 'text'
          }, {
            timeout: 5000,
            headers: { 'Content-Type': 'application/json' }
          });

          const textoTraduzido = response.data.translatedText || response.data.result || texto;
          return textoTraduzido;

        } catch (retryError) {
          if (tentativa === 2) throw retryError;
          await new Promise(resolve => setTimeout(resolve, 500 * tentativa));
        }
      }
    }

    // Para textos longos (como instruções), usar IA para tradução mais precisa
    if (texto.length >= 100 && genAI && process.env.GEMINI_API_KEY) {
      try {
        const prompt = `Traduza este texto de inglês para português brasileiro de forma natural:

"${texto}"

Responda apenas com a tradução.`;

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        const traducao = result.response.text().trim();
        return traducao;

      } catch (aiError) {
        // Fallback silencioso
      }
    }

    // Fallback: retornar texto original
    return texto;

  } catch (error) {
    return texto;
  }
}

// === FUNÇÕES THEMEALDB ===

// Buscar receitas no TheMealDB por ingrediente
async function buscarReceitasTheMealDB(ingrediente: string): Promise<MealDBResponse> {
  try {
    console.log(`🌐 Buscando no TheMealDB: ${ingrediente}`);
    
    const response = await axios.get(`${THEMEALDB_BASE_URL}/filter.php?i=${encodeURIComponent(ingrediente)}`, {
      timeout: 8000
    });
    
    return response.data;
    
  } catch (error) {
    console.error(`❌ Erro ao buscar no TheMealDB para ${ingrediente}:`, (error as Error).message);
    return { meals: null };
  }
}

// Obter detalhes completos de uma receita do TheMealDB
async function obterDetalhesTheMealDB(idMeal: string): Promise<MealDBRecipe | null> {
  try {
    const response = await axios.get(`${THEMEALDB_BASE_URL}/lookup.php?i=${idMeal}`, {
      timeout: 8000
    });
    
    return response.data.meals?.[0] || null;
    
  } catch (error) {
    console.error(`❌ Erro ao obter detalhes da receita ${idMeal}:`, (error as Error).message);
    return null;
  }
}

// Extrair ingredientes de receita TheMealDB
function extrairIngredientesTheMealDB(meal: MealDBRecipe): string[] {
  const ingredientes: string[] = [];
  
  for (let i = 1; i <= 20; i++) {
    const ingrediente = meal[`strIngredient${i}`];
    const medida = meal[`strMeasure${i}`];
    
    if (ingrediente?.trim()) {
      const item = medida?.trim() ? 
        `${medida.trim()} ${ingrediente.trim()}` : 
        ingrediente.trim();
      ingredientes.push(item);
    }
  }
  
  return ingredientes;
}

// Converter receita TheMealDB para nosso formato e salvar no banco
async function converterESalvarTheMealDB(meal: MealDBRecipe): Promise<ReceitaSugerida> {
  try {
    console.log(`🌐 Convertendo receita TheMealDB: ${meal.strMeal}`);

    const ingredientes = extrairIngredientesTheMealDB(meal);

    // Traduzir dados para português (otimizado - sem logs individuais)
    const nomePortugues = await traduzirParaPortugues(meal.strMeal);
    const instrucoesPortugues = meal.strInstructions ? await traduzirParaPortugues(meal.strInstructions) : 'Instruções não disponíveis';
    const categoriaPortugues = meal.strCategory ? await traduzirParaPortugues(meal.strCategory) : 'Internacional';
    const origemPortugues = meal.strArea ? await traduzirParaPortugues(meal.strArea) : 'Internacional';

    // Traduzir ingredientes em lote (otimizado)
    const ingredientesPortugues = ingredientes.length > 0 ?
      await Promise.all(ingredientes.map(ing => traduzirParaPortugues(ing))) :
      ingredientes;

    // Estimar tempo e dificuldade
    const tempoEstimado = ingredientes.length > 10 ? '1h' : ingredientes.length > 5 ? '45min' : '30min';
    const dificuldade = ingredientes.length > 12 ? 'Difícil' : ingredientes.length > 7 ? 'Médio' : 'Fácil';

    const receitaConvertida: ReceitaSugerida = {
      id: `themealdb-${meal.idMeal}`,
      nome: nomePortugues,
      categoria: categoriaPortugues,
      origem: origemPortugues,
      ingredientes: ingredientesPortugues,
      instrucoes: instrucoesPortugues,
      imagem: meal.strMealThumb || '/images/receita-internacional.jpg',
      tempoEstimado,
      dificuldade,
      fonte: 'themealdb' as const,
      tipo: 'Receita Internacional',
      rating: 4.2,
      fonte_url: `https://www.themealdb.com/meal/${meal.idMeal}`
    };

    // Salvar receita traduzida no banco (silencioso)
    try {
      await salvarReceitaNoBanco(receitaConvertida);
    } catch (saveError) {
      // Continua mesmo se não conseguir salvar - não loga erro para performance
    }

    return receitaConvertida;

  } catch (error) {
    console.error('❌ Erro ao converter receita TheMealDB:', (error as Error).message);
    throw error;
  }
}

// Salvar receita traduzida no banco de dados
async function salvarReceitaNoBanco(receita: ReceitaSugerida): Promise<void> {
  try {
    // Verificar se já existe
    const { data: existente } = await supabase
      .from('receitas')
      .select('id')
      .eq('external_id', receita.id)
      .single();
    
    if (existente) {
      console.log(`⚠️ Receita ${receita.nome} já existe no banco`);
      return;
    }
    
    // Inserir nova receita
    const { error } = await supabase
      .from('receitas')
      .insert({
        external_id: receita.id,
        nome: receita.nome,
        categoria: receita.categoria,
        origem: receita.origem,
        instrucoes: receita.instrucoes,
        ingredientes: receita.ingredientes,
        tempo_estimado: receita.tempoEstimado,
        dificuldade: receita.dificuldade,
        imagem_url: receita.imagem,
        fonte_url: receita.fonte_url,
        fonte: 'themealdb',
        ativo: true,
        verificado: true
      });
    
    if (error) {
      console.error('❌ Erro ao salvar receita no banco:', error);
    } else {
      console.log(`✅ Receita salva no banco: ${receita.nome}`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao salvar receita:', error);
  }
}

// Função para calcular compatibilidade de ingredientes
function calcularMatchScore(receitaIngredientes: string[], ingredientesUsuario: string[]): number {
  const ingredientesUsuarioLower = ingredientesUsuario.map(ing => ing.toLowerCase());
  let matches = 0;
  
  for (const ingrediente of receitaIngredientes) {
    const ingredienteLower = ingrediente.toLowerCase();
    if (ingredientesUsuarioLower.some(userIng => 
      ingredienteLower.includes(userIng) || userIng.includes(ingredienteLower)
    )) {
      matches++;
    }
  }
  
  return Math.round((matches / Math.max(receitaIngredientes.length, ingredientesUsuario.length)) * 100);
}

// IA para sugestões criativas com debug de APIs
async function gerarSugestoesCreativasIA(ingredientes: string[]): Promise<ReceitaSugerida[]> {
  console.log('🔍 Debug APIs de IA:', {
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    GROQ_API_KEY: !!process.env.GROQ_API_KEY,
    HF_TOKEN_COZINHA: !!process.env.HF_TOKEN_COZINHA,
    HF_TOKEN_MERCADO: !!process.env.HF_TOKEN_MERCADO,
    genAI_disponivel: !!genAI,
    groq_disponivel: !!groq
  });

  const prompt = `Você é o Chef Bruno, especialista em culinária brasileira criativa.

INGREDIENTES DISPONÍVEIS: ${ingredientes.join(', ')}

TAREFA: Criar 2 receitas CRIATIVAS e PRÁTICAS usando principalmente estes ingredientes.

REGRAS IMPORTANTES:
1. Use PELO MENOS 70% dos ingredientes fornecidos
2. Seja CRIATIVO mas PRÁTICO para casa
3. Foque em SABORES BRASILEIROS
4. Máximo 3 ingredientes extras por receita
5. Instruções claras e detalhadas

RESPONDA APENAS COM JSON VÁLIDO:
[
  {
    "nome": "Nome criativo da receita",
    "categoria": "Categoria (ex: Prato Principal, Sobremesa)",
    "ingredientes": ["${ingredientes.join('", "')}", "ingrediente extra 1", "ingrediente extra 2"],
    "instrucoes": "1. Passo detalhado\\n2. Segundo passo\\n3. Terceiro passo\\n4. Finalização",
    "tempo_estimado": "30min",
    "dificuldade": "Fácil",
    "dica_especial": "Dica única do Chef Bruno"
  }
]`;

  try {
    let resposta = '';
    let modeloUsado = '';
    
    // Tentar Gemini primeiro (modelo atualizado)
    if (genAI && process.env.GEMINI_API_KEY) {
      try {
        console.log('🤖 Tentando Gemini 1.5 Flash...');
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        resposta = result.response.text();
        modeloUsado = 'Gemini 1.5 Flash';
        console.log('✅ Gemini 1.5 Flash funcionou!');
      } catch (geminiError) {
        console.error('❌ Gemini 1.5 Flash falhou:', (geminiError as Error).message);
        // Tentar fallback para gemini-pro se disponível
        try {
          console.log('🤖 Tentando Gemini Pro (fallback)...');
          const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
          const result = await model.generateContent(prompt);
          resposta = result.response.text();
          modeloUsado = 'Gemini Pro';
          console.log('✅ Gemini Pro funcionou!');
        } catch (proError) {
          console.error('❌ Gemini Pro também falhou:', (proError as Error).message);
        }
      }
    }
    
    // Fallback para Groq (modelo atualizado)
    if (!resposta && groq && process.env.GROQ_API_KEY) {
      try {
        console.log('🤖 Tentando Groq Llama3...');
        const result = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: 'Você é o Chef Bruno, especialista em culinária brasileira criativa. Responda sempre em português brasileiro.' },
            { role: 'user', content: prompt }
          ],
          model: 'llama3-8b-8192', // Modelo mais recente do Groq
          temperature: 0.8,
          max_tokens: 1500
        });
        resposta = result.choices[0]?.message?.content || '';
        modeloUsado = 'Groq Llama3';
        console.log('✅ Groq Llama3 funcionou!');
      } catch (groqError) {
        console.error('❌ Groq Llama3 falhou:', (groqError as Error).message);
        // Tentar modelo alternativo
        try {
          console.log('🤖 Tentando Groq Mixtral (alternativo)...');
          const result = await groq.chat.completions.create({
            messages: [
              { role: 'system', content: 'Você é o Chef Bruno, especialista em culinária brasileira criativa. Responda sempre em português brasileiro.' },
              { role: 'user', content: prompt }
            ],
            model: 'mixtral-8x7b-32768', // Tentar o antigo como fallback
            temperature: 0.8,
            max_tokens: 1500
          });
          resposta = result.choices[0]?.message?.content || '';
          modeloUsado = 'Groq Mixtral';
          console.log('✅ Groq Mixtral funcionou!');
        } catch (mixtralError) {
          console.error('❌ Groq Mixtral também falhou:', (mixtralError as Error).message);
        }
      }
    }
    
    // Fallback para HuggingFace (modelos alternativos)
    if (!resposta && (process.env.HF_TOKEN_COZINHA || process.env.HF_TOKEN_MERCADO)) {
      try {
        console.log('🤖 Tentando HuggingFace GPT-2...');
        const hfToken = process.env.HF_TOKEN_COZINHA || process.env.HF_TOKEN_MERCADO;

        // Tentar GPT-2 primeiro
        try {
          const response = await axios.post(
            'https://api-inference.huggingface.co/models/gpt2',
            { inputs: prompt, parameters: { max_length: 500, temperature: 0.8 } },
            {
              headers: { 'Authorization': `Bearer ${hfToken}` },
              timeout: 20000
            }
          );

          resposta = response.data[0]?.generated_text || '';
          modeloUsado = 'HuggingFace GPT-2';
          console.log('✅ HuggingFace GPT-2 funcionou!');
        } catch (gpt2Error) {
          console.error('❌ HuggingFace GPT-2 falhou:', (gpt2Error as Error).message);

          // Tentar DialoGPT como fallback
          try {
            console.log('🤖 Tentando HuggingFace DialoGPT...');
            const response = await axios.post(
              'https://api-inference.huggingface.co/models/microsoft/DialoGPT-large',
              { inputs: prompt },
              {
                headers: { 'Authorization': `Bearer ${hfToken}` },
                timeout: 20000
              }
            );

            resposta = response.data.generated_text || '';
            modeloUsado = 'HuggingFace DialoGPT';
            console.log('✅ HuggingFace DialoGPT funcionou!');
          } catch (dialogptError) {
            console.error('❌ HuggingFace DialoGPT também falhou:', (dialogptError as Error).message);
          }
        }
      } catch (hfError) {
        console.error('❌ HuggingFace falhou:', (hfError as Error).message);
      }
    }
    
    if (!resposta) {
      throw new Error('Todas as APIs de IA falharam ou não estão configuradas');
    }

    // Limpar e parsear resposta
    const jsonLimpo = resposta.replace(/```json|```/g, '').trim();
    const receitasIA = JSON.parse(jsonLimpo);
    
    return receitasIA.map((receita: any, index: number) => ({
      id: `ia-${Date.now()}-${index}`,
      nome: receita.nome,
      categoria: receita.categoria,
      origem: 'Chef Bruno IA',
      ingredientes: receita.ingredientes,
      instrucoes: receita.instrucoes,
      imagem: '/images/receita-ia-placeholder.jpg',
      tempoEstimado: receita.tempo_estimado,
      dificuldade: receita.dificuldade,
      fonte: 'ia' as const,
      tipo: `Sugestão Criativa (${modeloUsado})`,
      rating: 4.3,
      dicaEspecial: receita.dica_especial
    }));

  } catch (error) {
    console.error('❌ Erro na IA criativa:', (error as Error).message);
    console.log('🔧 Debug: Nenhuma API de IA está funcionando. Verifique as chaves no Vercel.');
    return [];
  }
}


// Handler principal da API - SIMPLIFICADO (sem TheMealDB)
const handler = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  const tempoInicio = Date.now();
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }

  try {
    const { ingredientes } = req.body;

    if (!ingredientes || !Array.isArray(ingredientes) || ingredientes.length === 0) {
      res.status(400).json({ 
        error: 'Ingredientes são obrigatórios',
        message: 'Envie uma lista de ingredientes no corpo da requisição'
      });
      return;
    }

    console.log('🔍 Buscando sugestões para ingredientes:', ingredientes);
    const receitasEncontradas: ReceitaSugerida[] = [];

    // 1. BUSCAR RECEITAS NO BANCO LOCAL (receitas existentes)
    try {
      console.log('🗃️ Buscando receitas no banco local...');
      const resultadoLocal = await BancoDadosReceitas.buscarPorIngredientes(ingredientes, 4);
      
      if (resultadoLocal.receitasLocais.length > 0) {
        const receitasLocais = resultadoLocal.receitasLocais.map(receita => ({
          id: receita.id,
          nome: receita.nome,
          categoria: receita.categoria || 'Diversos',
          origem: receita.area_culinaria || 'Brasil',
          ingredientes: receita.ingredientes,
          instrucoes: receita.instrucoes,
          imagem: receita.imagem_url || '/images/receita-placeholder.jpg',
          tempoEstimado: receita.tempo_minutos ? `${receita.tempo_minutos}min` : '30min',
          dificuldade: receita.dificuldade || 'Médio',
          fonte: 'local' as const,
          tipo: 'Receita Local',
          rating: 4.5,
          matchScore: calcularMatchScore(receita.ingredientes, ingredientes),
          fonte_url: (receita as any).fonte_url || undefined
        }));
        
        receitasEncontradas.push(...receitasLocais);
        console.log(`✅ ${receitasLocais.length} receitas locais encontradas`);
      }
    } catch (error) {
      console.error('⚠️ Erro ao buscar receitas locais:', error);
    }

    // 2. BUSCAR RECEITAS NO THEMEALDB (receitas internacionais)
    try {
      console.log('🌐 Buscando receitas no TheMealDB...');
      
      // Traduzir ingredientes para inglês
      const ingredientesEn = await Promise.all(
        ingredientes.slice(0, 2).map(ing => traduzirParaIngles(ing))
      );
      
      console.log(`🔤 Ingredientes traduzidos: ${ingredientes} → ${ingredientesEn}`);
      
      // Buscar no TheMealDB com ingredientes traduzidos
      for (const ingredienteEn of ingredientesEn) {
        const resultadoMealDB = await buscarReceitasTheMealDB(ingredienteEn);
        
        if (resultadoMealDB.meals) {
          // Processar apenas as 3 primeiras receitas para não sobrecarregar
          const receitasLimitadas = resultadoMealDB.meals.slice(0, 3);
          
          for (const meal of receitasLimitadas) {
            try {
              const detalhes = await obterDetalhesTheMealDB(meal.idMeal);
              if (detalhes) {
                const receitaConvertida = await converterESalvarTheMealDB(detalhes);
                receitaConvertida.matchScore = calcularMatchScore(
                  receitaConvertida.ingredientes,
                  ingredientes
                );
                receitasEncontradas.push(receitaConvertida);
              }
            } catch (convError) {
              console.error('⚠️ Erro ao converter receita TheMealDB:', convError);
            }
          }
        }
      }
      
      const receitasTheMealDB = receitasEncontradas.filter(r => r.fonte === 'themealdb').length;
      console.log(`✅ ${receitasTheMealDB} receitas TheMealDB processadas e salvas`);
      
    } catch (error) {
      console.error('⚠️ Erro ao buscar no TheMealDB:', error);
    }

    // 3. GERAR SUGESTÕES CRIATIVAS COM IA
    try {
      console.log('🤖 Gerando sugestões criativas com IA...');
      const sugestoesIA = await gerarSugestoesCreativasIA(ingredientes);
      receitasEncontradas.push(...sugestoesIA);
      console.log(`✅ ${sugestoesIA.length} sugestões criativas geradas`);
    } catch (error) {
      console.error('⚠️ Erro ao gerar sugestões IA:', error);
    }

    // 4. ORDENAR RESULTADOS (prioridade: local > themealdb > ia)
    receitasEncontradas.sort((a, b) => {
      const prioridade = { local: 3, themealdb: 2, ia: 1 };
      const prioA = prioridade[a.fonte];
      const prioB = prioridade[b.fonte];
      
      if (prioA !== prioB) {
        return prioB - prioA;
      }
      return (b.matchScore || 0) - (a.matchScore || 0);
    });

    const receitasFinais = receitasEncontradas.slice(0, 12);
    const tempoResposta = Date.now() - tempoInicio;

    const response: SugestaoResponse = {
      success: true,
      data: {
        receitas: receitasFinais,
        ingredientesPesquisados: ingredientes,
        total: receitasFinais.length,
        fontes: {
          brasileiras: receitasFinais.filter(r => r.fonte === 'local').length,
          ia_criativas: receitasFinais.filter(r => r.fonte === 'ia').length,
          internacionais: receitasFinais.filter(r => r.fonte === 'themealdb').length
        },
        tempoResposta,
        traducao_ativa: true,
        receitas_salvas_no_banco: receitasFinais.filter(r => r.fonte === 'themealdb').length
      }
    };

    console.log(`✅ Sugestões geradas: ${receitasFinais.length} receitas em ${tempoResposta}ms`);
    console.log(`📊 Fontes: Local(${response.data.fontes.brasileiras}) + TheMealDB(${response.data.fontes.internacionais}) + IA(${response.data.fontes.ia_criativas})`);

    res.status(200).json(response);

  } catch (error) {
    console.error('❌ Erro na API de sugestões:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: 'Não foi possível gerar sugestões no momento'
    });
  }
}

export default withCors(handler);