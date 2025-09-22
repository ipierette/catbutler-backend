import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from '../_lib/cors';
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { BancoDadosReceitas } from '../_lib/banco-receitas';

// Configuração das APIs de IA
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const geminiModel = genAI ? genAI.getGenerativeModel({ model: 'gemini-pro' }) : null;
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

// Interface simplificada para receitas

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
  fonte: 'local' | 'ia';
  tipo: string;
  rating: number;
  matchScore?: number;
  dicaEspecial?: string;
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
    };
    tempoResposta: number;
  };
  error?: string;
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

// IA para sugestões criativas (NOVO: sem TheMealDB, sem tradução)
async function gerarSugestoesCreativasIA(ingredientes: string[]): Promise<ReceitaSugerida[]> {
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
    
    // Tentar Gemini primeiro (melhor para criatividade)
    if (genAI) {
      const result = await genAI.getGenerativeModel({ model: 'gemini-pro' }).generateContent(prompt);
      resposta = result.response.text();
    }
    // Fallback para Groq
    else if (groq) {
      const result = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: 'Você é o Chef Bruno, especialista em culinária brasileira criativa. Responda sempre em português brasileiro.' },
          { role: 'user', content: prompt }
        ],
        model: 'mixtral-8x7b-32768',
        temperature: 0.8,
        max_tokens: 1500
      });
      resposta = result.choices[0]?.message?.content || '';
    } else {
      throw new Error('Nenhuma IA configurada');
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
      tipo: 'Sugestão Criativa',
      rating: 4.3,
      dicaEspecial: receita.dica_especial
    }));

  } catch (error) {
    console.error('❌ Erro na IA criativa:', error);
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

    // 1. BUSCAR RECEITAS BRASILEIRAS REAIS (banco local)
    try {
      console.log('🗃️ Buscando receitas brasileiras no banco...');
      const resultadoLocal = await BancoDadosReceitas.buscarPorIngredientes(ingredientes, 6);
      
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
          tipo: 'Receita Brasileira',
          rating: 4.5,
          matchScore: calcularMatchScore(receita.ingredientes, ingredientes)
        }));
        
        receitasEncontradas.push(...receitasLocais);
        console.log(`✅ ${receitasLocais.length} receitas brasileiras encontradas`);
      }
    } catch (error) {
      console.error('⚠️ Erro ao buscar receitas locais:', error);
    }

    // 2. GERAR SUGESTÕES CRIATIVAS COM IA
    try {
      console.log('🤖 Gerando sugestões criativas com IA...');
      const sugestoesIA = await gerarSugestoesCreativasIA(ingredientes);
      receitasEncontradas.push(...sugestoesIA);
      console.log(`✅ ${sugestoesIA.length} sugestões criativas geradas`);
    } catch (error) {
      console.error('⚠️ Erro ao gerar sugestões IA:', error);
    }

    // 3. ORDENAR RESULTADOS (receitas reais primeiro, depois IA)
    receitasEncontradas.sort((a, b) => {
      if (a.fonte !== b.fonte) {
        return a.fonte === 'local' ? -1 : 1;
      }
      return (b.matchScore || 0) - (a.matchScore || 0);
    });

    const receitasFinais = receitasEncontradas.slice(0, 10);
    const tempoResposta = Date.now() - tempoInicio;

    const response: SugestaoResponse = {
      success: true,
      data: {
        receitas: receitasFinais,
        ingredientesPesquisados: ingredientes,
        total: receitasFinais.length,
        fontes: {
          brasileiras: receitasFinais.filter(r => r.fonte === 'local').length,
          ia_criativas: receitasFinais.filter(r => r.fonte === 'ia').length
        },
        tempoResposta
      }
    };

    console.log(`✅ Sugestões geradas: ${receitasFinais.length} receitas em ${tempoResposta}ms`);
    console.log(`📊 Fontes: Brasileiras(${response.data.fontes.brasileiras}) + IA(${response.data.fontes.ia_criativas})`);

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