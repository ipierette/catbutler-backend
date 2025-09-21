import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { traduzirReceita } from '../_lib/tradutor-cozinha';
import { BancoDadosReceitas } from '../_lib/banco-receitas';

// Interfaces para TheMealDB
interface MealDBRecipe {
  idMeal: string;
  strMeal: string;
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
interface ReceitaBusca {
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
  videoUrl?: string;
  fonte: 'mealdb' | 'local';
  relevancia?: number;
}

interface BuscaRequest {
  query?: string;
  ingrediente?: string;
  categoria?: string;
  origem?: string;
  limit?: number;
}

interface BuscaResponse {
  success: boolean;
  data: {
    receitas: ReceitaBusca[];
    filtros: {
      query?: string;
      ingrediente?: string;
      categoria?: string;
      origem?: string;
    };
    total: number;
    fonte: 'mealdb';
  };
  error?: string;
}

// Cache simples para categorias e países (evitar muitas chamadas à API)
let categoriasCache: { categories: any[] } | null = null;
let paisesCache: { meals: any[] } | null = null;

// Função para extrair ingredientes de uma receita do MealDB
function extrairIngredientes(meal: MealDBRecipe): string[] {
  const ingredientes: string[] = [];
  
  for (let i = 1; i <= 20; i++) {
    const ingrediente = meal[`strIngredient${i}`];
    const medida = meal[`strMeasure${i}`];
    
    if (ingrediente && ingrediente.trim()) {
      const item = medida && medida.trim() ? 
        `${medida.trim()} ${ingrediente.trim()}` : 
        ingrediente.trim();
      ingredientes.push(item);
    }
  }
  
  return ingredientes;
}

// Função para estimar tempo e dificuldade
function estimarTempoEDificuldade(meal: MealDBRecipe) {
  const ingredientes = extrairIngredientes(meal);
  const numIngredientes = ingredientes.length;
  const tamanhoInstrucoes = meal.strInstructions.length;
  
  // Estimar tempo baseado na quantidade de ingredientes e instruções
  let tempoEstimado = '15-30min';
  if (numIngredientes > 12 || tamanhoInstrucoes > 1200) {
    tempoEstimado = '60min+';
  } else if (numIngredientes > 8 || tamanhoInstrucoes > 800) {
    tempoEstimado = '45-60min';
  } else if (numIngredientes > 5 || tamanhoInstrucoes > 400) {
    tempoEstimado = '30-45min';
  }
  
  // Estimar dificuldade
  let dificuldade = 'Fácil';
  if (numIngredientes > 15 || tamanhoInstrucoes > 1500) {
    dificuldade = 'Difícil';
  } else if (numIngredientes > 10 || tamanhoInstrucoes > 800) {
    dificuldade = 'Médio';
  }
  
  return { tempoEstimado, dificuldade };
}

// Função para calcular relevância da busca
function calcularRelevancia(meal: MealDBRecipe, query?: string): number {
  if (!query) return 50;
  
  const queryLower = query.toLowerCase();
  let relevancia = 0;
  
  // Nome da receita (peso 40)
  if (meal.strMeal.toLowerCase().includes(queryLower)) {
    relevancia += 40;
  }
  
  // Categoria (peso 20)
  if (meal.strCategory.toLowerCase().includes(queryLower)) {
    relevancia += 20;
  }
  
  // Origem/País (peso 15)
  if (meal.strArea.toLowerCase().includes(queryLower)) {
    relevancia += 15;
  }
  
  // Tags (peso 15)
  if (meal.strTags && meal.strTags.toLowerCase().includes(queryLower)) {
    relevancia += 15;
  }
  
  // Ingredientes (peso 10)
  const ingredientes = extrairIngredientes(meal);
  const ingredienteMatch = ingredientes.some(ing => 
    ing.toLowerCase().includes(queryLower)
  );
  if (ingredienteMatch) {
    relevancia += 10;
  }
  
  return Math.min(relevancia, 100);
}

// Função para converter receita do MealDB para nosso formato
function converterReceitaMealDB(meal: MealDBRecipe, query?: string): ReceitaBusca {
  const ingredientes = extrairIngredientes(meal);
  const { tempoEstimado, dificuldade } = estimarTempoEDificuldade(meal);
  
  return {
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
    videoUrl: meal.strYoutube || '',
    fonte: 'mealdb' as const,
    relevancia: calcularRelevancia(meal, query)
  };
}

// Função para buscar receitas por nome
async function buscarPorNome(query: string): Promise<MealDBResponse> {
  try {
    const response = await axios.get(
      `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`
    );
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar receitas por nome:', error);
    return { meals: null };
  }
}

// Função para buscar receitas por ingrediente
async function buscarPorIngrediente(ingrediente: string): Promise<MealDBResponse> {
  try {
    const response = await axios.get(
      `https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(ingrediente)}`
    );
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar receitas por ingrediente:', error);
    return { meals: null };
  }
}

// Função para buscar receitas por categoria
async function buscarPorCategoria(categoria: string): Promise<MealDBResponse> {
  try {
    const response = await axios.get(
      `https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(categoria)}`
    );
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar receitas por categoria:', error);
    return { meals: null };
  }
}

// Função para buscar receitas por país/origem
async function buscarPorOrigem(origem: string): Promise<MealDBResponse> {
  try {
    const response = await axios.get(
      `https://www.themealdb.com/api/json/v1/1/filter.php?a=${encodeURIComponent(origem)}`
    );
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar receitas por origem:', error);
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

// Função para buscar receitas aleatórias
async function buscarReceitasAleatorias(quantidade: number): Promise<ReceitaBusca[]> {
  const receitas: ReceitaBusca[] = [];
  
  try {
    for (let i = 0; i < quantidade; i++) {
      const response = await axios.get('https://www.themealdb.com/api/json/v1/1/random.php');
      const meal = response.data.meals?.[0];
      
      if (meal) {
        receitas.push(converterReceitaMealDB(meal));
      }
    }
  } catch (error) {
    console.error('Erro ao buscar receitas aleatórias:', error);
  }
  
  return receitas;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Suportar tanto GET quanto POST
    const params = req.method === 'GET' ? req.query : req.body;
    
    const {
      query,
      ingrediente,
      categoria,
      origem,
      limit = 12
    }: BuscaRequest = params;

    const limitNum = parseInt(String(limit));
    const limiteSanitizado = Math.min(Math.max(limitNum || 12, 1), 50);

    console.log('🔍 Iniciando busca com parâmetros:', {
      query, ingrediente, categoria, origem, limit: limiteSanitizado
    });

    let resultados: MealDBResponse = { meals: null };
    let tiposBusca: string[] = [];

    // Estratégia de busca em ordem de prioridade
    if (query) {
      console.log('Buscando por nome:', query);
      resultados = await buscarPorNome(query);
      tiposBusca.push('nome');
      
      // Se não encontrar por nome, tentar por ingrediente
      if (!resultados.meals || resultados.meals.length === 0) {
        console.log('Buscando query como ingrediente:', query);
        resultados = await buscarPorIngrediente(query);
        tiposBusca.push('ingrediente');
      }
    } else if (ingrediente) {
      console.log('Buscando por ingrediente:', ingrediente);
      resultados = await buscarPorIngrediente(ingrediente);
      tiposBusca.push('ingrediente');
    } else if (categoria) {
      console.log('Buscando por categoria:', categoria);
      resultados = await buscarPorCategoria(categoria);
      tiposBusca.push('categoria');
    } else if (origem) {
      console.log('Buscando por origem:', origem);
      resultados = await buscarPorOrigem(origem);
      tiposBusca.push('origem');
    } else {
      // Busca padrão: receitas aleatórias
      console.log('Buscando receitas aleatórias');
      const receitasAleatorias = await buscarReceitasAleatorias(limiteSanitizado);
      
      return res.status(200).json({
        success: true,
        data: {
          receitas: receitasAleatorias,
          filtros: {},
          total: receitasAleatorias.length,
          fonte: 'mealdb'
        }
      } as BuscaResponse);
    }

    // Processar resultados
    const receitasProcessadas: ReceitaBusca[] = [];
    
    if (resultados.meals) {
      // Para receitas que vêm apenas com info básica (filtros), buscar detalhes completos
      const precisaDetalhes = !resultados.meals[0]?.strInstructions;
      
      for (const meal of resultados.meals.slice(0, limiteSanitizado)) {
        let receitaCompleta = meal;
        
        if (precisaDetalhes) {
          const detalhes = await obterDetalhesReceita(meal.idMeal);
          if (detalhes) {
            receitaCompleta = detalhes;
          } else {
            continue; // Pular se não conseguir obter detalhes
          }
        }
        
        const receitaConvertida = converterReceitaMealDB(receitaCompleta, query);
        receitasProcessadas.push(receitaConvertida);
      }
    }

    // Ordenar por relevância se houver query de texto
    if (query) {
      receitasProcessadas.sort((a, b) => (b.relevancia || 0) - (a.relevancia || 0));
    }

    const response: BuscaResponse = {
      success: true,
      data: {
        receitas: receitasProcessadas,
        filtros: {
          ...(query && { query }),
          ...(ingrediente && { ingrediente }),
          ...(categoria && { categoria }),
          ...(origem && { origem })
        },
        total: receitasProcessadas.length,
        fonte: 'mealdb'
      }
    };

    console.log(`✅ Busca concluída: ${receitasProcessadas.length} receitas encontradas`);
    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ Erro na API de busca:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      data: {
        receitas: [],
        filtros: {},
        total: 0,
        fonte: 'mealdb'
      }
    } as BuscaResponse);
  }
}