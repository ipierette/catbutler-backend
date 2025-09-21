import type { VercelRequest, VercelResponse } from '@vercel/node';
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { traduzirReceita } from '../_lib/tradutor-cozinha';
import { BancoDadosReceitas } from '../_lib/banco-receitas';

// Configuração das APIs de IA
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const geminiModel = genAI ? genAI.getGenerativeModel({ model: 'gemini-pro' }) : null;
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

// Interface para receitas do TheMealDB
interface MealDBRecipe {
  idMeal: string;
  strMeal: string;
  strDrinkAlternate?: string;
  strCategory: string;
  strArea: string;
  strInstructions: string;
  strMealThumb: string;
  strTags?: string;
  strYoutube?: string;
  [key: string]: string | undefined;
}

interface MealDBResponse {
  meals: MealDBRecipe[] | null;
}

// Interface para nossa resposta padronizada
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
  tags?: string[];
  fonte: 'mealdb' | 'ia' | 'local';
  matchScore?: number;
}

interface SugestaoResponse {
  success: boolean;
  data: {
    receitas: ReceitaSugerida[];
    ingredientesPesquisados: string[];
    total: number;
    fontes: {
      local: number;
      mealdb: number;
      ia: number;
    };
    tempoResposta: number;
  };
  error?: string;
}

// Função para buscar receitas do TheMealDB por ingrediente
async function buscarReceitasPorIngrediente(ingrediente: string): Promise<MealDBResponse> {
  try {
    const response = await axios.get(
      `https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(ingrediente)}`
    );
    return response.data;
  } catch (error) {
    console.error(`Erro ao buscar receitas para ${ingrediente}:`, error);
    return { meals: null };
  }
}

// Função para obter detalhes completos de uma receita
async function obterDetalhesReceita(idMeal: string): Promise<MealDBRecipe | null> {
  try {
    const response = await axios.get(
      `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${idMeal}`
    );
    return response.data.meals?.[0] || null;
  } catch (error) {
    console.error(`Erro ao obter detalhes da receita ${idMeal}:`, error);
    return null;
  }
}

// Função para extrair ingredientes de uma receita do MealDB
function extrairIngredientes(meal: MealDBRecipe): string[] {
  const ingredientes: string[] = [];
  
  for (let i = 1; i <= 20; i++) {
    const ingrediente = meal[`strIngredient${i}`];
    const medida = meal[`strMeasure${i}`];
    if (ingrediente?.trim()) {
      const item = medida?.trim() ? `${medida.trim()} ${ingrediente.trim()}` : ingrediente.trim();
      ingredientes.push(item);
    }
  }
  
  return ingredientes;
}

// Função para converter receita do MealDB para nosso formato
function converterReceitaMealDB(meal: MealDBRecipe): ReceitaSugerida {
  const ingredientes = extrairIngredientes(meal);
  
  // Estimar tempo baseado na quantidade de ingredientes e instruções
  let tempoEstimado: string;
  if (ingredientes.length > 10) {
    tempoEstimado = '45-60min';
  } else if (ingredientes.length > 5) {
    tempoEstimado = '30-45min';
  } else {
    tempoEstimado = '15-30min';
  }
  
  // Estimar dificuldade baseada no número de ingredientes e tamanho das instruções
  const numIngredientes = ingredientes.length;
  const tamanhoInstrucoes = meal.strInstructions.length;
  
  let dificuldade = 'Fácil';
  if (numIngredientes > 12 || tamanhoInstrucoes > 1000) {
    dificuldade = 'Difícil';
  } else if (numIngredientes > 7 || tamanhoInstrucoes > 500) {
    dificuldade = 'Médio';
  }
  
  const receita = {
    id: meal.idMeal,
    nome: meal.strMeal,
    categoria: meal.strCategory,
    origem: meal.strArea,
    ingredientes,
    instrucoes: meal.strInstructions,
    imagem: meal.strMealThumb,
    tempoEstimado,
    dificuldade,
    tags: meal.strTags ? meal.strTags.split(',').map(tag => tag.trim()) : [],
    fonte: 'mealdb' as const
  };

  // Traduzir receita para PT-BR
  return traduzirReceita(receita);
}

// Função para gerar sugestões usando Gemini (primário) ou Groq (fallback)
async function gerarSugestoesIA(ingredientes: string[]): Promise<ReceitaSugerida[]> {
  try {
    console.log('🤖 Gerando sugestões com IA para:', ingredientes);
    // Tentar Gemini primeiro (melhor para criação de receitas)
    if (geminiModel) {
      try {
        return await gerarSugestoesGemini(ingredientes);
      } catch (geminiError) {
        console.warn('⚠️ Gemini falhou, tentando Groq:', geminiError);
      }
    }
    // Fallback para Groq
    if (groq) {
      return await gerarSugestoesGroq(ingredientes);
    }
    return [];
  } catch (error) {
    console.error('❌ Erro ao gerar sugestões IA:', error);
    return [];
  }
}

// Geração de receitas usando Gemini (ideal para conteúdo criativo)
async function gerarSugestoesGemini(ingredientes: string[]): Promise<ReceitaSugerida[]> {
  const prompt = `Como chef especialista, crie 1 receita brasileira deliciosa e prática usando principalmente: ${ingredientes.join(', ')}.

Responda EXATAMENTE neste formato JSON:
{
  "nome": "Nome da receita",
  "categoria": "Categoria (ex: Prato Principal, Sobremesa)",
  "ingredientes": ["${ingredientes.join('", "')}", "outros ingredientes necessários"],
  "instrucoes": "Passo a passo detalhado do preparo",
  "tempo": "15-30min",
  "dificuldade": "Fácil",
  "origem": "Brasileiro"
}`;

  const result = await geminiModel!.generateContent(prompt);
  const response = result.response;
  const text = await response.text();
  try {
    // Extrair JSON da resposta
    const jsonMatch = /\{[\s\S]*\}/.exec(text);
    if (!jsonMatch) throw new Error('JSON não encontrado na resposta');
    const receitaData = JSON.parse(jsonMatch[0]);
    const sugestaoGemini: ReceitaSugerida = {
      id: `gemini-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      nome: receitaData.nome || `Receita com ${ingredientes[0]}`,
      categoria: receitaData.categoria || 'Prato Principal',
      origem: receitaData.origem || 'Brasileiro',
      ingredientes: receitaData.ingredientes || [...ingredientes, 'sal a gosto', 'temperos'],
      instrucoes: receitaData.instrucoes || 'Instruções não disponíveis',
      imagem: '/images/receita-gemini-placeholder.jpg',
      tempoEstimado: receitaData.tempo || '30min',
      dificuldade: receitaData.dificuldade || 'Fácil',
      fonte: 'ia',
      matchScore: 95
    };
    console.log('✅ Receita gerada com Gemini:', sugestaoGemini.nome);
    return [sugestaoGemini];
  } catch (parseError) {
    console.warn('⚠️ Erro ao parsear resposta Gemini, usando fallback');
    throw parseError;
  }
}


// Fallback usando Groq
async function gerarSugestoesGroq(ingredientes: string[]): Promise<ReceitaSugerida[]> {
  if (!groq) throw new Error('Groq não configurado');
  const prompt = `Como chef especialista, crie 1 receita brasileira deliciosa e prática usando principalmente: ${ingredientes.join(', ')}.\n\nResponda EXATAMENTE neste formato JSON:\n{\n  "nome": "Nome da receita",\n  "categoria": "Categoria (ex: Prato Principal, Sobremesa)",\n  "ingredientes": ["${ingredientes.join('", "')}", "outros ingredientes necessários"],\n  "instrucoes": "Passo a passo detalhado do preparo",\n  "tempo": "15-30min",\n  "dificuldade": "Fácil",\n  "origem": "Brasileiro"\n}`;
  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'Você é um Chef IA especialista em culinária brasileira e internacional. Responda sempre em português brasileiro, seja prestativo e didático.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    model: 'llama3-8b-8192',
    temperature: 0.7,
    max_tokens: 300,
    top_p: 1,
    stream: false
  });
  const resposta = completion.choices[0]?.message?.content || '';
  try {
    const jsonMatch = /\{[\s\S]*\}/.exec(resposta);
    if (!jsonMatch) throw new Error('JSON não encontrado na resposta');
    const receitaData = JSON.parse(jsonMatch[0]);
    const sugestaoGroq: ReceitaSugerida = {
      id: `groq-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      nome: receitaData.nome || `Receita com ${ingredientes[0]}`,
      categoria: receitaData.categoria || 'Prato Principal',
      origem: receitaData.origem || 'Brasileiro',
      ingredientes: receitaData.ingredientes || [...ingredientes, 'sal a gosto', 'temperos'],
      instrucoes: receitaData.instrucoes || 'Instruções não disponíveis',
      imagem: '/images/receita-groq-placeholder.jpg',
      tempoEstimado: receitaData.tempo || '30min',
      dificuldade: receitaData.dificuldade || 'Fácil',
      fonte: 'ia',
      matchScore: 90
    };
    console.log('✅ Receita gerada com Groq:', sugestaoGroq.nome);
    return [sugestaoGroq];
  } catch (parseError) {
    console.warn('⚠️ Erro ao parsear resposta Groq:', parseError);
    return [];
  }
}

// Função para calcular score de match entre ingredientes
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

// Handler principal da API
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const tempoInicio = Date.now();
  
  // Configurar CORS
  // CORS: Permitir apenas a URL do frontend de produção
  const allowedOrigin = process.env.FRONTEND_URL || 'https://catbutler-frontend.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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

    // 1. BUSCAR NO BANCO LOCAL (receitas dos usuários)
    try {
      console.log('🗃️ Buscando receitas no banco local...');
      const resultadoLocal = await BancoDadosReceitas.buscarPorIngredientes(ingredientes, 5);
      
      if (resultadoLocal.receitasLocais.length > 0) {
        const receitasLocais = resultadoLocal.receitasLocais.map(receita => ({
          id: receita.id,
          nome: receita.nome,
          categoria: receita.categoria || 'Diversos',
          origem: receita.area_culinaria || 'Local',
          ingredientes: receita.ingredientes,
          instrucoes: receita.instrucoes,
          imagem: receita.imagem_url || '/images/receita-placeholder.jpg',
          tempoEstimado: receita.tempo_minutos ? `${receita.tempo_minutos}min` : '30min',
          dificuldade: receita.dificuldade || 'Médio',
          tags: receita.tags || [],
          fonte: 'local' as const,
          matchScore: calcularMatchScore(receita.ingredientes, ingredientes)
        }));
        
        receitasEncontradas.push(...receitasLocais);
        console.log(`✅ Encontradas ${receitasLocais.length} receitas no banco local`);
      }
    } catch (error) {
      console.error('⚠️ Erro ao buscar no banco local (continuando):', error);
    }

    // 2. BUSCAR NA API TheMealDB
    try {
      console.log('🌐 Buscando receitas no TheMealDB...');
      const ingredientePrincipal = ingredientes[0];
      const resultadoMealDB = await buscarReceitasPorIngrediente(ingredientePrincipal);
      
      if (resultadoMealDB.meals) {
        // Limitar a 4 receitas para não sobrecarregar
        const receitasLimitadas = resultadoMealDB.meals.slice(0, 4);
        
        for (const meal of receitasLimitadas) {
          const detalhes = await obterDetalhesReceita(meal.idMeal);
          if (detalhes) {
            const receitaConvertida = converterReceitaMealDB(detalhes);
            receitaConvertida.matchScore = calcularMatchScore(
              receitaConvertida.ingredientes,
              ingredientes
            );
            receitasEncontradas.push(receitaConvertida);
          }
        }
        console.log(`✅ Encontradas ${receitasLimitadas.length} receitas no TheMealDB`);
      }
    } catch (error) {
      console.error('⚠️ Erro ao buscar no TheMealDB (continuando):', error);
    }

    // 3. GERAR SUGESTÕES COM IA
    try {
      console.log('🤖 Gerando sugestões com IA...');
      const sugestoesIA = await gerarSugestoesIA(ingredientes);
      receitasEncontradas.push(...sugestoesIA);
      console.log(`✅ Geradas ${sugestoesIA.length} sugestões com IA`);
    } catch (error) {
      console.error('⚠️ Erro ao gerar sugestões IA (continuando):', error);
    }

    // 4. ORDENAR E LIMITAR RESULTADOS
    // Priorizar: Local > IA > TheMealDB, depois por match score
    receitasEncontradas.sort((a, b) => {
      // Prioridade por fonte
      const prioridadeFonte = { local: 3, ia: 2, mealdb: 1 };
      const prioridadeA = prioridadeFonte[a.fonte];
      const prioridadeB = prioridadeFonte[b.fonte];
      
      if (prioridadeA !== prioridadeB) {
        return prioridadeB - prioridadeA;
      }
      
      // Se mesma fonte, ordenar por match score
      return (b.matchScore || 0) - (a.matchScore || 0);
    });

    // Limitar a 12 receitas máximo
    const receitasFinais = receitasEncontradas.slice(0, 12);

    const tempoResposta = Date.now() - tempoInicio;

    const response: SugestaoResponse = {
      success: true,
      data: {
        receitas: receitasFinais,
        ingredientesPesquisados: ingredientes,
        total: receitasFinais.length,
        fontes: {
          local: receitasFinais.filter(r => r.fonte === 'local').length,
          mealdb: receitasFinais.filter(r => r.fonte === 'mealdb').length,
          ia: receitasFinais.filter(r => r.fonte === 'ia').length
        },
        tempoResposta
      }
    };

    console.log(`✅ Sugestões geradas: ${receitasFinais.length} receitas em ${tempoResposta}ms`);
    console.log(`📊 Fontes: Local(${response.data.fontes.local}) + MealDB(${response.data.fontes.mealdb}) + IA(${response.data.fontes.ia})`);

    res.status(200).json(response);

  } catch (error) {
    console.error('❌ Erro na API de sugestões:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: 'Não foi possível gerar sugestões no momento'
    });
  }
}