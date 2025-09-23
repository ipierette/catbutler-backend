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

// URLs das APIs (múltiplas para fallback)
const LIBRE_TRANSLATE_URLS = [
  'https://libretranslate.com/translate',
  'https://libretranslate.de/translate',
  'https://translate.argosopentech.com/translate'
];
const THEMEALDB_BASE_URL = 'https://www.themealdb.com/api/json/v1/1';

// Cache simples para traduções (em memória)
const translationCache = new Map<string, CacheEntry>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas em ms

interface CacheEntry {
  translation: string;
  timestamp: number;
}

// Mapeamento de títulos comuns do TheMealDB EN → PT (expandido)
const TITULOS_COMUNS: Record<string, string> = {
  // Receitas com Chicken
  'chicken congee': 'Congee de Frango',
  'brown stew chicken': 'Frango Ensopado Marrom',
  'chicken & mushroom hotpot': 'Frango com Cogumelos ao Forno',
  'chicken alfredo primavera': 'Frango Alfredo Primavera',
  'chicken fajita mac and cheese': 'Macarrão com Queijo e Fajita de Frango',
  'chicken marengo': 'Frango Marengo',
  'chicken parmentier': 'Parmentier de Frango',
  'chicken quinoa greek salad': 'Salada Grega de Frango com Quinoa',
  'chicken tikka masala': 'Frango Tikka Masala',
  'chicken enchilada casserole': 'Caçarola de Enchilada de Frango',
  'chicken basque': 'Frango Basco',
  'chicken ham and leek pie': 'Torta de Frango, Presunto e Alho-poró',
  'chicken handi': 'Frango Handi',
  'chicken karaage': 'Frango Karaage',
  'chicken katsu': 'Frango Katsu',
  'chicken teriyaki': 'Frango Teriyaki',

  // Receitas com Beef
  'beef banh mi bowls': 'Tigelas de Banh Mi de Carne',
  'beef stroganoff': 'Estrogonofe de Carne',
  'beef wellington': 'Wellington de Carne',
  'beef and mustard pie': 'Torta de Carne com Mostarda',
  'beef rendang': 'Rendang de Carne',
  'beef dumpling stew': 'Ensopado de Bolinhos de Carne',
  'beef mechado': 'Mechado de Carne',
  'beef lo mein': 'Lo Mein de Carne',
  'beef bourguignon': 'Bourguignon de Carne',
  'beef sunday roast': 'Assado Dominical de Carne',

  // Receitas com outros ingredientes
  'egyptian fatteh': 'Fatteh Egípcio',
  'spanish lamb stew': 'Ensopado de Cordeiro Espanhol',
  'lamb tagine': 'Tajine de Cordeiro',
  'lamb biryani': 'Biryani de Cordeiro',
  'fish pie': 'Torta de Peixe',
  'seafood paella': 'Paella de Frutos do Mar',
  'vegetarian casserole': 'Caçarola Vegetariana',
  'vegan chocolate cake': 'Bolo de Chocolate Vegano',
  'chocolate gateau': 'Gateau de Chocolate',
  'pasta salad': 'Salada de Macarrão',

  // Adicionar padrões genéricos
  'with': 'com',
  'and': 'e',
  'chicken': 'Frango',
  'beef': 'Carne',
  'lamb': 'Cordeiro',
  'fish': 'Peixe',
  'seafood': 'Frutos do Mar',
  'vegetarian': 'Vegetariano',
  'vegan': 'Vegano',
  'salad': 'Salada',
  'soup': 'Sopa',
  'stew': 'Ensopado',
  'curry': 'Caril',
  'pie': 'Torta',
  'cake': 'Bolo',
  'pasta': 'Massa',
  'rice': 'Arroz',
  'noodles': 'Macarrão',
  'sauce': 'Molho',
  'spicy': 'Picante',
  'hot': 'Quente',
  'cold': 'Frio',
  'roast': 'Assado',
  'grilled': 'Grelhado',
  'fried': 'Frito',
  'baked': 'Assado',
  'steamed': 'Cozido no Vapor'
};

// Mapeamento de categorias e origens do TheMealDB EN → PT
const CATEGORIAS_ORIGENS: Record<string, string> = {
  // Categorias
  'chicken': 'Frango',
  'beef': 'Carne Bovina',
  'pork': 'Carne Suína',
  'lamb': 'Cordeiro',
  'fish': 'Peixe',
  'seafood': 'Frutos do Mar',
  'vegetarian': 'Vegetariano',
  'vegan': 'Vegano',
  'dessert': 'Sobremesa',
  'starter': 'Entrada',
  'side': 'Acompanhamento',
  'pasta': 'Massa',
  'miscellaneous': 'Diversos',

  // Origens/Países
  'american': 'Americano',
  'british': 'Britânico',
  'canadian': 'Canadense',
  'chinese': 'Chinês',
  'croatian': 'Croata',
  'dutch': 'Holandês',
  'egyptian': 'Egípcio',
  'french': 'Francês',
  'greek': 'Grego',
  'indian': 'Indiano',
  'irish': 'Irlandês',
  'italian': 'Italiano',
  'jamaican': 'Jamaicano',
  'japanese': 'Japonês',
  'kenyan': 'Queniano',
  'malaysian': 'Malaio',
  'mexican': 'Mexicano',
  'moroccan': 'Marroquino',
  'polish': 'Polonês',
  'portuguese': 'Português',
  'russian': 'Russo',
  'spanish': 'Espanhol',
  'thai': 'Tailandês',
  'tunisian': 'Tunisiano',
  'turkish': 'Turco',
  'vietnamese': 'Vietnamita'
};

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

// Função auxiliar para cache
function getCacheKey(texto: string, source: string, target: string): string {
  return `${source}-${target}-${texto.toLowerCase().trim()}`;
}

function getFromCache(key: string): string | null {
  const entry = translationCache.get(key) as CacheEntry | undefined;
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.translation;
  }
  if (entry) {
    translationCache.delete(key); // Remover entrada expirada
  }
  return null;
}

function saveToCache(key: string, translation: string): void {
  translationCache.set(key, { translation, timestamp: Date.now() });
}

// Traduzir texto português para inglês (para busca no TheMealDB) - OTIMIZADO
async function traduzirParaIngles(texto: string): Promise<string> {
  try {
    // Verificar cache primeiro
    const cacheKey = getCacheKey(texto, 'pt', 'en');
    const cached = getFromCache(cacheKey);
    if (cached) {
      console.log(`✅ Cache hit PT→EN: "${texto}" → "${cached}"`);
      return cached;
    }

    console.log(`🔤 Traduzindo PT→EN: "${texto}"`);

    // 1. Primeiro, verificar se é um ingrediente comum mapeado
    const textoLower = texto.toLowerCase();
    if (INGREDIENTES_COMUNS[textoLower]) {
      const traducao = INGREDIENTES_COMUNS[textoLower];
      saveToCache(cacheKey, traducao);
      console.log(`✅ Ingrediente comum mapeado: "${texto}" → "${traducao}"`);
      return traducao;
    }

    // 2. Se não for mapeado, tentar tradução automática (APENAS 1 tentativa para economizar quota)
    try {
      const response = await axios.post(LIBRE_TRANSLATE_URLS[0], {
        q: texto,
        source: 'pt',
        target: 'en',
        format: 'text'
      }, {
        timeout: 5000, // Timeout menor
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'CatButler/1.0'
        }
      });

      const textoTraduzido = response.data.translatedText || response.data.result || texto;

      // Só salvar no cache se for diferente do original
      if (textoTraduzido !== texto) {
        saveToCache(cacheKey, textoTraduzido);
        console.log(`✅ Tradução automática PT→EN: "${texto}" → "${textoTraduzido}"`);
        return textoTraduzido;
      }

    } catch (retryError) {
      console.warn(`⚠️ Tradução automática falhou:`, (retryError as Error).message);
    }

    // Salvar no cache mesmo que seja igual ao original (para evitar futuras tentativas)
    saveToCache(cacheKey, texto);
    return texto;

  } catch (error) {
    console.warn('⚠️ Erro na tradução PT→EN, tentando buscar com termo original:', (error as Error).message);
    return texto;
  }
}

// Traduzir título de receita especificamente (mais robusto)
async function traduzirTituloReceita(texto: string): Promise<string> {
  try {
    if (!texto || texto.trim().length === 0) {
      return texto;
    }

    console.log(`🍽️ Traduzindo título: "${texto}"`);

    // Primeiro, verificar mapeamento exato
    const textoLower = texto.toLowerCase();
    if (TITULOS_COMUNS[textoLower]) {
      const traducao = TITULOS_COMUNS[textoLower];
      console.log(`✅ Título exato mapeado: "${texto}" → "${traducao}"`);
      return traducao;
    }

    // Tentar tradução parcial
    let textoTraduzido = textoLower;
    let substituicoes = 0;
    for (const [ingles, portugues] of Object.entries(TITULOS_COMUNS)) {
      if (textoTraduzido.includes(ingles) && ingles.length > 2) {
        textoTraduzido = textoTraduzido.replace(new RegExp(ingles, 'gi'), portugues);
        substituicoes++;
        console.log(`🔄 Substituição: "${ingles}" → "${portugues}"`);
      }
    }

    // Se houve substituições, capitalizar adequadamente
    if (substituicoes > 0) {
      textoTraduzido = textoTraduzido.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      console.log(`✅ Tradução parcial: "${texto}" → "${textoTraduzido}" (${substituicoes} substituições)`);
      return textoTraduzido;
    }

    // Se não houve substituições, tentar tradução automática
    console.log(`🤖 Tentando tradução automática para título: "${texto}"`);
    const traducaoAuto = await traduzirTextoAutomatico(texto);
    if (traducaoAuto) {
      console.log(`✅ Tradução automática: "${texto}" → "${traducaoAuto}"`);
      return traducaoAuto;
    }

    // Fallback: usar IA para títulos complexos
    if (genAI && process.env.GEMINI_API_KEY) {
      try {
        console.log(`🧠 Usando IA para título complexo: "${texto}"`);
        const prompt = `Traduza este título de receita de inglês para português brasileiro de forma natural e precisa. Mantenha o estilo de título de receita:

"${texto}"

Responda apenas com a tradução.`;

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        const traducao = result.response.text().trim();

        if (traducao && traducao !== texto) {
          console.log(`✅ IA traduzido: "${texto}" → "${traducao}"`);
          return traducao;
        }
      } catch (aiError) {
        console.warn('⚠️ IA falhou para título:', (aiError as Error).message);
      }
    }

    // Último fallback: retornar original
    console.warn(`⚠️ Fallback: usando título original "${texto}"`);
    return texto;

  } catch (error) {
    console.warn(`❌ Erro na tradução de título "${texto}":`, (error as Error).message);
    return texto;
  }
}

// Traduzir ingredientes de forma otimizada (reduz chamadas API)
async function traduzirIngredientesOtimizado(ingredientes: string[]): Promise<string[]> {
  try {
    console.log(`🌿 Traduzindo ${ingredientes.length} ingredientes otimizadamente...`);

    const ingredientesTraduzidos: string[] = [];

    // Traduzir em lote para economizar chamadas
    for (let i = 0; i < ingredientes.length; i += 5) {
      const lote = ingredientes.slice(i, i + 5);
      console.log(`📦 Traduzindo lote ${Math.floor(i/5) + 1}: ${lote.join(', ')}`);

      // Tentar traduzir o lote inteiro de uma vez
      try {
        const textoLote = lote.join('; ');
        const traducaoLote = await traduzirTextoAutomatico(textoLote);

        if (traducaoLote) {
          const ingredientesTraduzidosLote = traducaoLote.split(';').map(ing => ing.trim());
          ingredientesTraduzidos.push(...ingredientesTraduzidosLote);
          console.log(`✅ Traduzido lote: ${lote.length} ingredientes`);
        } else {
          // Fallback: traduzir individualmente
          for (const ingrediente of lote) {
            const traducao = await traduzirParaPortugues(ingrediente);
            ingredientesTraduzidos.push(traducao);
          }
        }
      } catch (error) {
        console.warn(`⚠️ Erro no lote, traduzindo individualmente...`);
        // Fallback: traduzir individualmente
        for (const ingrediente of lote) {
          const traducao = await traduzirParaPortugues(ingrediente);
          ingredientesTraduzidos.push(traducao);
        }
      }
    }

    return ingredientesTraduzidos;

  } catch (error) {
    console.error('❌ Erro na tradução otimizada de ingredientes:', (error as Error).message);
    // Fallback: retornar ingredientes originais
    return ingredientes;
  }
}

// Traduzir texto automático (função auxiliar - UMA tentativa apenas)
async function traduzirTextoAutomatico(texto: string): Promise<string | null> {
  try {
    console.log(`🌐 Tentando traduzir: "${texto}" (uma tentativa)`);

    // Tentar apenas o primeiro servidor disponível
    const url = LIBRE_TRANSLATE_URLS[0];

    const response = await axios.post(url, {
      q: texto,
      source: 'pt',
      target: 'en',
      format: 'text'
    }, {
      timeout: 3000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CatButler/1.0'
      }
    });

    const textoTraduzido = response.data.translatedText || response.data.result;
    if (textoTraduzido && textoTraduzido !== texto) {
      console.log(`✅ Traduzido: "${texto}" → "${textoTraduzido}"`);
      return textoTraduzido;
    }

    return null;

  } catch (error) {
    console.warn(`⚠️ Tradução falhou: ${(error as Error).message || 'Erro desconhecido'}`);
    return null;
  }
}

// Traduzir texto inglês para português (para respostas do TheMealDB) - OTIMIZADO
async function traduzirParaPortugues(texto: string): Promise<string> {
  try {
    // Se for texto vazio, retornar vazio
    if (!texto || texto.trim().length === 0) {
      return texto;
    }

    // Verificar cache primeiro
    const cacheKey = getCacheKey(texto, 'en', 'pt');
    const cached = getFromCache(cacheKey);
    if (cached) {
      console.log(`✅ Cache hit EN→PT: "${texto.substring(0, 30)}..." → "${cached.substring(0, 30)}..."`);
      return cached;
    }

    console.log(`🔤 Traduzindo EN→PT: "${texto.substring(0, 30)}..." (${texto.length} chars)`);

    // Primeiro, verificar se é título conhecido (caso exato)
    const textoLower = texto.toLowerCase();
    if (TITULOS_COMUNS[textoLower]) {
      const traducao = TITULOS_COMUNS[textoLower];
      saveToCache(cacheKey, traducao);
      console.log(`✅ Título mapeado: "${texto}" → "${traducao}"`);
      return traducao;
    }

    // Verificar se é categoria ou origem conhecida
    if (CATEGORIAS_ORIGENS[textoLower]) {
      const traducao = CATEGORIAS_ORIGENS[textoLower];
      saveToCache(cacheKey, traducao);
      console.log(`✅ Categoria/Origem mapeada: "${texto}" → "${traducao}"`);
      return traducao;
    }

    // Tentar tradução parcial - substituir palavras conhecidas
    let textoTraduzido = textoLower;
    for (const [ingles, portugues] of Object.entries(TITULOS_COMUNS)) {
      if (textoTraduzido.includes(ingles) && ingles.length > 2) {
        textoTraduzido = textoTraduzido.replace(new RegExp(ingles, 'gi'), portugues);
        console.log(`🔄 Substituição parcial: "${ingles}" → "${portugues}" em "${texto}"`);
      }
    }

    // Se houve substituição parcial, capitalizar adequadamente
    if (textoTraduzido !== textoLower) {
      textoTraduzido = textoTraduzido.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      saveToCache(cacheKey, textoTraduzido);
      console.log(`✅ Tradução parcial: "${texto}" → "${textoTraduzido}"`);
      return textoTraduzido;
    }

    // Para textos curtos (nome, categoria, origem), usar tradução automática - UMA tentativa
    if (texto.length < 100) {
      try {
        const response = await axios.post(LIBRE_TRANSLATE_URLS[0], {
          q: texto,
          source: 'en',
          target: 'pt',
          format: 'text'
        }, {
          timeout: 3000,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'CatButler/1.0'
          }
        });

        const textoTraduzido = response.data.translatedText || response.data.result;
        if (textoTraduzido && textoTraduzido !== texto) {
          saveToCache(cacheKey, textoTraduzido);
          console.log(`✅ Traduzido: "${texto.substring(0, 30)}..." → "${textoTraduzido.substring(0, 30)}..."`);
          return textoTraduzido;
        }
      } catch (error: any) {
        console.warn(`⚠️ Tradução falhou para "${texto.substring(0, 30)}..."`);
      }
    }

    // Para textos longos (instruções), usar IA para tradução mais precisa
    if (texto.length >= 100 && genAI && process.env.GEMINI_API_KEY) {
      try {
        console.log(`🤖 Traduzindo texto longo com IA...`);
        const prompt = `Traduza este texto de inglês para português brasileiro de forma natural e precisa:

"${texto}"

Responda apenas com a tradução, sem comentários.`;

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        const traducao = result.response.text().trim();

        if (traducao && traducao !== texto) {
          saveToCache(cacheKey, traducao);
          console.log(`✅ IA traduzido: "${texto.substring(0, 30)}..." → "${traducao.substring(0, 30)}..."`);
          return traducao;
        }
      } catch (aiError) {
        console.warn('⚠️ Tradução com IA falhou:', (aiError as Error).message);
      }
    }

    // Salvar no cache mesmo que seja igual ao original (para evitar futuras tentativas)
    saveToCache(cacheKey, texto);
    console.warn(`⚠️ Fallback: usando original "${texto.substring(0, 30)}..."`);
    return texto;

  } catch (error) {
    console.warn(`❌ Erro na tradução "${texto.substring(0, 30)}...":`, (error as Error).message);
    return texto;
  }
}

// === FUNÇÕES THEMEALDB ===

// Buscar receitas no TheMealDB por ingrediente com retry e backoff
async function buscarReceitasTheMealDB(ingrediente: string): Promise<MealDBResponse> {
  const maxRetries = 3;
  const baseDelay = 1000; // 1 segundo

  for (let tentativa = 1; tentativa <= maxRetries; tentativa++) {
    try {
      console.log(`🌐 Buscando no TheMealDB: ${ingrediente} (tentativa ${tentativa}/${maxRetries})`);

      const response = await axios.get(`${THEMEALDB_BASE_URL}/filter.php?i=${encodeURIComponent(ingrediente)}`, {
        timeout: 8000,
        headers: {
          'User-Agent': 'CatButler/1.0',
          'Accept': 'application/json'
        }
      });

      return response.data;

    } catch (error: any) {
      const statusCode = error.response?.status;
      const isRateLimited = statusCode === 429;
      const isServerError = statusCode >= 500;

      if (isRateLimited || isServerError) {
        if (tentativa === maxRetries) {
          console.error(`❌ TheMealDB falhou após ${maxRetries} tentativas para ${ingrediente}:`, error.message);
          break;
        }

        const delay = baseDelay * Math.pow(2, tentativa - 1); // Backoff exponencial
        console.warn(`⚠️ Tentativa ${tentativa} falhou para ${ingrediente}. Aguardando ${delay}ms antes da próxima...`);
        await new Promise(resolve => setTimeout(resolve, delay));

      } else {
        // Erro não recuperável (ex: 404, 400)
        console.error(`❌ Erro não recuperável no TheMealDB para ${ingrediente}:`, error.message);
        break;
      }
    }
  }

  return { meals: null };
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
    const nomePortugues = await traduzirTituloReceita(meal.strMeal);
    const instrucoesPortugues = meal.strInstructions ? await traduzirParaPortugues(meal.strInstructions) : 'Instruções não disponíveis';
    const categoriaPortugues = meal.strCategory ? await traduzirParaPortugues(meal.strCategory) : 'Internacional';
    const origemPortugues = meal.strArea ? await traduzirParaPortugues(meal.strArea) : 'Internacional';

    // Traduzir ingredientes de forma inteligente (otimizada)
    const ingredientesPortugues = ingredientes.length > 0 ?
      await traduzirIngredientesOtimizado(ingredientes) :
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

// IA para sugestões criativas com debug de APIs e fallbacks melhorados
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

  // Tentar múltiplas APIs com retry para cada uma
  const apisParaTentar = [
    {
      nome: 'Gemini 1.5 Flash',
      testar: async () => {
        if (!genAI || !process.env.GEMINI_API_KEY) return null;
        console.log('🤖 Tentando Gemini 1.5 Flash...');

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        return { resposta: result.response.text(), modelo: 'Gemini 1.5 Flash' };
      }
    },
    {
      nome: 'Groq Mixtral',
      testar: async () => {
        if (!groq || !process.env.GROQ_API_KEY) return null;
        console.log('🤖 Tentando Groq Mixtral...');

        const result = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: 'Você é o Chef Bruno, especialista em culinária brasileira criativa. Responda sempre em português brasileiro.' },
            { role: 'user', content: prompt }
          ],
          model: 'mixtral-8x7b-32768',
          temperature: 0.8,
          max_tokens: 1500
        });
        return { resposta: result.choices[0]?.message?.content || '', modelo: 'Groq Mixtral' };
      }
    },
    {
      nome: 'HuggingFace FLAN-T5',
      testar: async () => {
        const hfToken = process.env.HF_TOKEN_COZINHA || process.env.HF_TOKEN_MERCADO;
        if (!hfToken) return null;
        console.log('🤖 Tentando HuggingFace FLAN-T5...');

        const response = await axios.post(
          'https://api-inference.huggingface.co/models/google/flan-t5-base',
          { inputs: prompt, parameters: { max_length: 500, temperature: 0.8 } },
          {
            headers: { 'Authorization': `Bearer ${hfToken}` },
            timeout: 10000
          }
        );
        return { resposta: response.data[0]?.generated_text || '', modelo: 'HuggingFace FLAN-T5' };
      }
    }
  ];

  let resposta = '';
  let modeloUsado = '';

  // Tentar cada API uma vez
  for (const api of apisParaTentar) {
    try {
      const resultado = await api.testar();
      if (resultado && resultado.resposta) {
        resposta = resultado.resposta;
        modeloUsado = resultado.modelo;
        console.log(`✅ ${modeloUsado} funcionou!`);
        break;
      }
    } catch (error) {
      console.warn(`❌ ${api.nome} falhou:`, (error as Error).message);
    }
  }

  if (!resposta) {
    console.log('🔧 Todas as APIs de IA falharam. Gerando resposta simples...');
    modeloUsado = 'Chef Bruno (Fallback)';
  }

  try {
    // Verificar se é resposta de fallback (texto simples) ou JSON
    let receitasIA;
    if (modeloUsado === 'Chef Bruno (Fallback)') {
      // Gerar resposta de fallback mais estruturada
      const ingredientesPrincipais = ingredientes.slice(0, 3);
      const nomeReceita = `${ingredientesPrincipais[0].charAt(0).toUpperCase() + ingredientesPrincipais[0].slice(1)} Especial do Chef`;

      receitasIA = [{
        nome: nomeReceita,
        categoria: 'Prato Principal',
        ingredientes: ingredientesPrincipais,
        instrucoes: `Olá! Sou o Chef Bruno, especialista em culinária brasileira.

Com os ingredientes: ${ingredientes.join(', ')}, posso sugerir esta opção deliciosa:

🍽️ **${nomeReceita}**
Uma receita prática e saborosa usando os ingredientes que você tem em casa!

**Ingredientes sugeridos:**
${ingredientesPrincipais.map(ing => `- ${ing}`).join('\n')}

**Modo de preparo:**
1. Prepare os ingredientes: pique, corte ou rale conforme necessário
2. Refogue os ingredientes principais em uma panela com um fio de óleo
3. Tempere com sal, pimenta e temperos brasileiros (alho, cebola, pimentão)
4. Cozinhe por cerca de 15-20 minutos até ficar no ponto
5. Sirva quente e aproveite!

💡 **Dica do Chef:** Use temperos brasileiros como alho, cebola, pimentão e cheiro-verde para dar mais sabor!

Preciso das minhas APIs funcionando para dar sugestões mais criativas. Tente novamente em alguns minutos.`,
        tempo_estimado: '25min',
        dificuldade: 'Fácil',
        dica_especial: 'Sistema em modo de emergência - tente novamente em alguns minutos'
      }];
    } else {
      // Resposta normal - limpar e parsear JSON
      const jsonLimpo = resposta.replace(/```json|```/g, '').trim();
      receitasIA = JSON.parse(jsonLimpo);
    }

    return receitasIA.map((receita: any, index: number) => ({
      id: `ia-${Date.now()}-${index}`,
      nome: receita.nome,
      categoria: receita.categoria || 'Prato Principal',
      origem: 'Chef Bruno IA',
      ingredientes: receita.ingredientes || ingredientes,
      instrucoes: receita.instrucoes || 'Instruções não disponíveis',
      imagem: '/images/receita-ia-placeholder.jpg',
      tempoEstimado: receita.tempo_estimado || '30min',
      dificuldade: receita.dificuldade || 'Fácil',
      fonte: 'ia' as const,
      tipo: `Sugestão Criativa (${modeloUsado})`,
      rating: 4.3,
      dicaEspecial: receita.dica_especial || 'Sugestão do Chef Bruno'
    }));

  } catch (error) {
    console.error('❌ Erro ao processar resposta da IA:', (error as Error).message);
    // Retornar uma receita mínima de emergência
    return [{
      id: `ia-emergency-${Date.now()}`,
      nome: `${ingredientes[0].charAt(0).toUpperCase() + ingredientes[0].slice(1)} do Chef Bruno`,
      categoria: 'Prato Principal',
      origem: 'Chef Bruno IA',
      ingredientes: ingredientes,
      instrucoes: 'Sistema temporariamente indisponível. Tente novamente em alguns minutos.',
      imagem: '/images/receita-ia-placeholder.jpg',
      tempoEstimado: '30min',
      dificuldade: 'Fácil',
      fonte: 'ia' as const,
      tipo: 'Sugestão de Emergência',
      rating: 4.0
    }];
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

      // Tentar com múltiplos ingredientes para melhores resultados
      const ingredientesParaBuscar: string[] = [];

      // Tentar traduzir os primeiros 3 ingredientes para economizar quota
      const maxIngredientesParaBuscar = Math.min(ingredientes.length, 3);

      for (let i = 0; i < maxIngredientesParaBuscar; i++) {
        const ingrediente = ingredientes[i];
        try {
          const traducao = await traduzirParaIngles(ingrediente);
          ingredientesParaBuscar.push(traducao || ingrediente);
          console.log(`🔤 Preparando busca: "${ingrediente}" → "${traducao || ingrediente}"`);
        } catch (traducaoError) {
          console.warn(`⚠️ Tradução falhou para "${ingrediente}", usando original`);
          ingredientesParaBuscar.push(ingrediente);
        }
      }

      // Buscar receitas para cada ingrediente (paralelo com limite)
      const promises = ingredientesParaBuscar.map(async (ingredienteEn, index) => {
        try {
          console.log(`🔍 Buscando no TheMealDB com: "${ingredienteEn}"`);
          const resultadoMealDB = await buscarReceitasTheMealDB(ingredienteEn);

          if (resultadoMealDB.meals && resultadoMealDB.meals.length > 0) {
            // Processar apenas 1 receita por ingrediente para não sobrecarregar
            const receitaParaProcessar = resultadoMealDB.meals.slice(0, 1);
            console.log(`✅ Encontradas ${resultadoMealDB.meals.length} receitas para "${ingredienteEn}", processando ${receitaParaProcessar.length}`);

            for (const meal of receitaParaProcessar) {
              try {
                const detalhes = await obterDetalhesTheMealDB(meal.idMeal);
                if (detalhes) {
                  const receitaConvertida = await converterESalvarTheMealDB(detalhes);
                  receitaConvertida.matchScore = calcularMatchScore(
                    receitaConvertida.ingredientes,
                    ingredientes
                  );
                  return receitaConvertida;
                }
              } catch (convError) {
                console.error(`⚠️ Erro ao converter receita TheMealDB para ${ingredienteEn}:`, convError);
              }
            }
          } else {
            console.log(`⚠️ Nenhuma receita encontrada no TheMealDB para "${ingredienteEn}"`);
          }
          return null;
        } catch (error) {
          console.error(`❌ Erro ao buscar no TheMealDB para "${ingredienteEn}":`, error);
          return null;
        }
      });

      // Executar buscas em paralelo com limite de concorrência
      const receitasTheMealDB = [];
      const batchSize = 2; // Máximo 2 buscas simultâneas

      for (let i = 0; i < promises.length; i += batchSize) {
        const batch = promises.slice(i, i + batchSize);
        const resultados = await Promise.all(batch);
        receitasTheMealDB.push(...resultados.filter(r => r !== null));
      }

      // Remover duplicatas baseado no ID
      const receitasUnicas = receitasTheMealDB.filter((receita, index, self) =>
        index === self.findIndex(r => r.id === receita.id)
      );

      receitasEncontradas.push(...receitasUnicas);
      console.log(`✅ ${receitasUnicas.length} receitas únicas do TheMealDB processadas e salvas`);

    } catch (error) {
      console.error('⚠️ Erro ao buscar no TheMealDB:', error);
    }

    // 3. GERAR SUGESTÕES CRIATIVAS COM IA (APENAS SE NECESSÁRIO)
    let sugestoesIA = [];
    if (receitasEncontradas.length < 4) {
    try {
        console.log(`🤖 ${receitasEncontradas.length} receitas totais - gerando IA...`);
        sugestoesIA = await gerarSugestoesCreativasIA(ingredientes);
      receitasEncontradas.push(...sugestoesIA);
        console.log(`✅ ${sugestoesIA.length} sugestões criativas geradas`);
    } catch (error) {
        console.error('⚠️ Erro ao gerar sugestões IA:', error);
      }
    } else {
      console.log(`✅ ${receitasEncontradas.length} receitas suficientes - pulando IA`);
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