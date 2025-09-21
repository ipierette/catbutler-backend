import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

// Interface para receitas do TheMealDB
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
  fonte: 'mealdb' | 'estatico';
  matchScore?: number;
  apresentadoPor?: string;
}

// Receitas estáticas para fallback
const RECEITAS_ESTATICAS: ReceitaSugerida[] = [
  {
    id: 'est-1',
    nome: 'Frango Grelhado com Batatas',
    categoria: 'Prato Principal',
    origem: 'Brasil',
    ingredientes: ['500g de peito de frango', '4 batatas médias', 'sal', 'pimenta', 'azeite', 'alho'],
    instrucoes: '1. Tempere o frango com sal, pimenta e alho\n2. Corte as batatas em cubos\n3. Grelhe o frango por 6-8 minutos de cada lado\n4. Frite as batatas até dourar\n5. Sirva quente',
    imagem: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=400',
    tempoEstimado: '30min',
    dificuldade: 'Fácil',
    fonte: 'estatico',
    apresentadoPor: 'Chef CatButler'
  },
  {
    id: 'est-2',
    nome: 'Arroz com Feijão Especial',
    categoria: 'Prato Principal',
    origem: 'Brasil',
    ingredientes: ['2 xícaras de arroz', '1 xícara de feijão', 'cebola', 'alho', 'óleo', 'sal'],
    instrucoes: '1. Refogue a cebola e alho\n2. Adicione o arroz e refogue\n3. Adicione água e cozinhe\n4. Prepare o feijão separadamente\n5. Sirva junto',
    imagem: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400',
    tempoEstimado: '45min',
    dificuldade: 'Fácil',
    fonte: 'estatico',
    apresentadoPor: 'Chef CatButler'
  },
  {
    id: 'est-3',
    nome: 'Omelete com Queijo',
    categoria: 'Café da Manhã',
    origem: 'Brasil',
    ingredientes: ['3 ovos', '100g queijo mussarela', 'sal', 'pimenta', 'manteiga'],
    instrucoes: '1. Bata os ovos com sal e pimenta\n2. Aqueça a frigideira com manteiga\n3. Despeje os ovos\n4. Adicione o queijo\n5. Dobre ao meio e sirva',
    imagem: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=400',
    tempoEstimado: '10min',
    dificuldade: 'Fácil',
    fonte: 'estatico',
    apresentadoPor: 'Chef CatButler'
  }
];

// Função para buscar receitas do TheMealDB por ingrediente
async function buscarReceitasPorIngrediente(ingrediente: string): Promise<MealDBResponse> {
  try {
    console.log(`🌐 Buscando receitas TheMealDB para: ${ingrediente}`);
    const response = await axios.get(
      `https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(ingrediente)}`,
      { timeout: 5000 }
    );
    return response.data;
  } catch (error) {
    console.error(`❌ Erro ao buscar receitas TheMealDB para ${ingrediente}:`, error);
    return { meals: null };
  }
}

// Função para obter detalhes completos de uma receita
async function obterDetalhesReceita(idMeal: string): Promise<MealDBRecipe | null> {
  try {
    const response = await axios.get(
      `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${idMeal}`,
      { timeout: 5000 }
    );
    return response.data.meals?.[0] || null;
  } catch (error) {
    console.error(`❌ Erro ao obter detalhes da receita ${idMeal}:`, error);
    return null;
  }
}

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

// Função para traduzir categorias
function traduzirCategoria(categoria: string): string {
  const traducoes: { [key: string]: string } = {
    'Beef': 'Carne Bovina',
    'Chicken': 'Frango',
    'Dessert': 'Sobremesa',
    'Lamb': 'Cordeiro',
    'Miscellaneous': 'Diversos',
    'Pasta': 'Massa',
    'Pork': 'Porco',
    'Seafood': 'Frutos do Mar',
    'Side': 'Acompanhamento',
    'Starter': 'Entrada',
    'Vegan': 'Vegano',
    'Vegetarian': 'Vegetariano',
    'Breakfast': 'Café da Manhã',
    'Goat': 'Cabra'
  };
  
  return traducoes[categoria] || categoria;
}

// Função para converter receita do MealDB para nosso formato
function converterReceitaMealDB(meal: MealDBRecipe): ReceitaSugerida {
  const ingredientes = extrairIngredientes(meal);
  
  // Estimar tempo baseado na quantidade de ingredientes
  let tempoEstimado: string;
  if (ingredientes.length > 10) {
    tempoEstimado = '60-90min';
  } else if (ingredientes.length > 7) {
    tempoEstimado = '30-60min';
  } else {
    tempoEstimado = '15-30min';
  }
  
  // Estimar dificuldade
  const numIngredientes = ingredientes.length;
  const tamanhoInstrucoes = meal.strInstructions.length;
  
  let dificuldade = 'Fácil';
  if (numIngredientes > 12 || tamanhoInstrucoes > 1000) {
    dificuldade = 'Difícil';
  } else if (numIngredientes > 7 || tamanhoInstrucoes > 500) {
    dificuldade = 'Médio';
  }
  
  return {
    id: meal.idMeal,
    nome: meal.strMeal,
    categoria: traduzirCategoria(meal.strCategory),
    origem: meal.strArea || 'Internacional',
    ingredientes,
    instrucoes: meal.strInstructions,
    imagem: meal.strMealThumb,
    tempoEstimado,
    dificuldade,
    tags: meal.strTags ? meal.strTags.split(',').map(tag => tag.trim()) : [],
    fonte: 'mealdb',
    apresentadoPor: 'Chef Internacional'
  };
}

// Função para calcular match score
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

// Função para filtrar receitas estáticas por ingredientes
function filtrarReceitasEstaticas(ingredientes: string[]): ReceitaSugerida[] {
  return RECEITAS_ESTATICAS.filter(receita => {
    const matchScore = calcularMatchScore(receita.ingredientes, ingredientes);
    receita.matchScore = matchScore;
    return matchScore > 20; // Pelo menos 20% de match
  }).sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
}

// Handler principal da API
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const tempoInicio = Date.now();
  
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
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
        success: false,
        error: 'Ingredientes são obrigatórios',
        message: 'Envie uma lista de ingredientes no corpo da requisição'
      });
      return;
    }

    console.log('🔍 [MODO SEM IA] Buscando sugestões para ingredientes:', ingredientes);
    const receitasEncontradas: ReceitaSugerida[] = [];

    // 1. BUSCAR NA API TheMealDB (principal fonte)
    try {
      console.log('🌐 Buscando receitas no TheMealDB...');
      
      // Buscar para múltiplos ingredientes
      const promisesBusca = ingredientes.slice(0, 3).map(ingrediente => 
        buscarReceitasPorIngrediente(ingrediente)
      );
      
      const resultadosTheMealDB = await Promise.all(promisesBusca);
      const todasReceitas = new Map<string, MealDBRecipe>();
      
      // Consolidar receitas únicas
      for (const resultado of resultadosTheMealDB) {
        if (resultado.meals) {
          for (const meal of resultado.meals.slice(0, 3)) {
            if (!todasReceitas.has(meal.idMeal)) {
              todasReceitas.set(meal.idMeal, meal);
            }
          }
        }
      }
      
      // Converter receitas encontradas
      const receitasTheMealDB = Array.from(todasReceitas.values()).slice(0, 8);
      
      for (const meal of receitasTheMealDB) {
        try {
          const detalhes = await obterDetalhesReceita(meal.idMeal);
          if (detalhes) {
            const receitaConvertida = converterReceitaMealDB(detalhes);
            receitaConvertida.matchScore = calcularMatchScore(
              receitaConvertida.ingredientes,
              ingredientes
            );
            receitasEncontradas.push(receitaConvertida);
          }
        } catch (error) {
          console.error(`⚠️ Erro ao processar receita ${meal.idMeal}:`, error);
        }
      }
      
      console.log(`✅ Encontradas ${receitasEncontradas.length} receitas no TheMealDB`);
    } catch (error) {
      console.error('⚠️ Erro ao buscar no TheMealDB:', error);
    }

    // 2. ADICIONAR RECEITAS ESTÁTICAS (fallback e complemento)
    try {
      console.log('🏠 Filtrando receitas estáticas...');
      const receitasEstaticas = filtrarReceitasEstaticas(ingredientes);
      receitasEncontradas.push(...receitasEstaticas);
      console.log(`✅ Adicionadas ${receitasEstaticas.length} receitas estáticas`);
    } catch (error) {
      console.error('⚠️ Erro ao filtrar receitas estáticas:', error);
    }

    // 3. Se não encontrou nada, dar receitas genéricas
    if (receitasEncontradas.length === 0) {
      console.log('🎯 Nenhuma receita específica encontrada, usando receitas populares');
      const receitasGenericas = RECEITAS_ESTATICAS.map(receita => ({
        ...receita,
        matchScore: 50 // Score neutro
      }));
      receitasEncontradas.push(...receitasGenericas);
    }

    // 4. ORDENAR E LIMITAR RESULTADOS
    receitasEncontradas.sort((a, b) => {
      // Priorizar TheMealDB por ter imagens reais
      if (a.fonte !== b.fonte) {
        return a.fonte === 'mealdb' ? -1 : 1;
      }
      // Depois por match score
      return (b.matchScore || 0) - (a.matchScore || 0);
    });

    // Limitar a 10 receitas máximo
    const receitasFinais = receitasEncontradas.slice(0, 10);
    const tempoResposta = Date.now() - tempoInicio;

    const response = {
      success: true,
      data: {
        receitas: receitasFinais,
        ingredientesPesquisados: ingredientes,
        total: receitasFinais.length,
        fontes: {
          mealdb: receitasFinais.filter(r => r.fonte === 'mealdb').length,
          estatico: receitasFinais.filter(r => r.fonte === 'estatico').length,
          ia: 0 // Não disponível nesta versão
        },
        tempoResposta,
        modo: 'SEM_IA',
        observacao: 'Versão simplificada sem IA. Configure HF_TOKEN_COZINHA para ativar IA.'
      }
    };

    console.log(`✅ [MODO SEM IA] Sugestões geradas: ${receitasFinais.length} receitas em ${tempoResposta}ms`);
    console.log(`📊 Fontes: TheMealDB(${response.data.fontes.mealdb}) + Estáticas(${response.data.fontes.estatico})`);

    res.status(200).json(response);

  } catch (error) {
    console.error('❌ Erro na API de sugestões:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor',
      message: 'Não foi possível gerar sugestões no momento. Verifique os logs.',
      modo: 'SEM_IA'
    });
  }
}