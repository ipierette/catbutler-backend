// 🗃️ Helper para buscar receitas no banco de dados local Supabase
// Integra receitas dos usuários com APIs externas

import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Interface para receita do banco local
interface ReceitaLocal {
  id: string;
  nome: string;
  descricao?: string;
  ingredientes: string[];
  instrucoes: string;
  tempo_minutos?: number;
  dificuldade?: string;
  categoria?: string;
  area_culinaria?: string;
  imagem_url?: string;
  tags?: string[];
  created_at: string;
  user_id?: string;
  fonte_externa_id?: string;
  fonte_tipo: 'local' | 'mealdb' | 'ia';
}

// Interface para busca híbrida (local + externa)
interface ResultadoBuscaHibrida {
  receitasLocais: ReceitaLocal[];
  totalLocal: number;
  tempoResposta: number;
}

export class BancoDadosReceitas {
  // Buscar receitas no banco local por ingredientes
  static async buscarPorIngredientes(ingredientes: string[], limite: number = 10): Promise<ResultadoBuscaHibrida> {
    const tempoInicio = Date.now();
    
    try {
      console.log('🔍 Buscando receitas locais com ingredientes:', ingredientes);
      
      // Query que busca receitas que contenham pelo menos um dos ingredientes
      const { data: receitas, error } = await supabase
        .from('receitas')
        .select('*')
        .or(
          ingredientes.map(ing => 
            `ingredientes.cs.{"${ing.toLowerCase()}"}`
          ).join(',')
        )
        .limit(limite);

      if (error) {
        console.error('❌ Erro ao buscar receitas por ingredientes:', error);
        return { receitasLocais: [], totalLocal: 0, tempoResposta: Date.now() - tempoInicio };
      }

      const receitasFormatadas = receitas?.map(this.formatarReceitaLocal) || [];
      
      console.log(`✅ Encontradas ${receitasFormatadas.length} receitas locais`);
      
      return {
        receitasLocais: receitasFormatadas,
        totalLocal: receitasFormatadas.length,
        tempoResposta: Date.now() - tempoInicio
      };

    } catch (error) {
      console.error('❌ Erro na busca local por ingredientes:', error);
      return { receitasLocais: [], totalLocal: 0, tempoResposta: Date.now() - tempoInicio };
    }
  }

  // Buscar receitas no banco local por nome
  static async buscarPorNome(nome: string, limite: number = 10): Promise<ResultadoBuscaHibrida> {
    const tempoInicio = Date.now();
    
    try {
      console.log('🔍 Buscando receitas locais por nome:', nome);
      
      const { data: receitas, error } = await supabase
        .from('receitas')
        .select('*')
        .or(`nome.ilike.%${nome}%,descricao.ilike.%${nome}%`)
        .limit(limite);

      if (error) {
        console.error('❌ Erro ao buscar receitas por nome:', error);
        return { receitasLocais: [], totalLocal: 0, tempoResposta: Date.now() - tempoInicio };
      }

      const receitasFormatadas = receitas?.map(this.formatarReceitaLocal) || [];
      
      console.log(`✅ Encontradas ${receitasFormatadas.length} receitas locais por nome`);
      
      return {
        receitasLocais: receitasFormatadas,
        totalLocal: receitasFormatadas.length,
        tempoResposta: Date.now() - tempoInicio
      };

    } catch (error) {
      console.error('❌ Erro na busca local por nome:', error);
      return { receitasLocais: [], totalLocal: 0, tempoResposta: Date.now() - tempoInicio };
    }
  }

  // Buscar receitas por categoria
  static async buscarPorCategoria(categoria: string, limite: number = 10): Promise<ResultadoBuscaHibrida> {
    const tempoInicio = Date.now();
    
    try {
      console.log('🔍 Buscando receitas locais por categoria:', categoria);
      
      const { data: receitas, error } = await supabase
        .from('receitas')
        .select('*')
        .eq('categoria', categoria)
        .limit(limite);

      if (error) {
        console.error('❌ Erro ao buscar receitas por categoria:', error);
        return { receitasLocais: [], totalLocal: 0, tempoResposta: Date.now() - tempoInicio };
      }

      const receitasFormatadas = receitas?.map(this.formatarReceitaLocal) || [];
      
      return {
        receitasLocais: receitasFormatadas,
        totalLocal: receitasFormatadas.length,
        tempoResposta: Date.now() - tempoInicio
      };

    } catch (error) {
      console.error('❌ Erro na busca local por categoria:', error);
      return { receitasLocais: [], totalLocal: 0, tempoResposta: Date.now() - tempoInicio };
    }
  }

  // Buscar receitas populares/mais favoritadas
  static async buscarPopulares(limite: number = 10): Promise<ResultadoBuscaHibrida> {
    const tempoInicio = Date.now();
    
    try {
      console.log('🔍 Buscando receitas populares locais');
      
      // Busca receitas ordenadas pelo número de favoritos
      const { data: receitas, error } = await supabase
        .from('receitas')
        .select(`
          *,
          favoritos_count:receitas_favoritas(count)
        `)
        .order('created_at', { ascending: false })
        .limit(limite);

      if (error) {
        console.error('❌ Erro ao buscar receitas populares:', error);
        return { receitasLocais: [], totalLocal: 0, tempoResposta: Date.now() - tempoInicio };
      }

      const receitasFormatadas = receitas?.map(this.formatarReceitaLocal) || [];
      
      return {
        receitasLocais: receitasFormatadas,
        totalLocal: receitasFormatadas.length,
        tempoResposta: Date.now() - tempoInicio
      };

    } catch (error) {
      console.error('❌ Erro na busca de receitas populares:', error);
      return { receitasLocais: [], totalLocal: 0, tempoResposta: Date.now() - tempoInicio };
    }
  }

  // Buscar receitas por múltiplos critérios
  static async buscarAvancada(params: {
    nome?: string;
    ingredientes?: string[];
    categoria?: string;
    dificuldade?: string;
    tempoMax?: number;
    limite?: number;
  }): Promise<ResultadoBuscaHibrida> {
    const tempoInicio = Date.now();
    const { nome, ingredientes, categoria, dificuldade, tempoMax, limite = 10 } = params;
    
    try {
      console.log('🔍 Busca avançada local com parâmetros:', params);
      
      let query = supabase.from('receitas').select('*');
      
      // Filtro por nome
      if (nome) {
        query = query.or(`nome.ilike.%${nome}%,descricao.ilike.%${nome}%`);
      }
      
      // Filtro por categoria
      if (categoria) {
        query = query.eq('categoria', categoria);
      }
      
      // Filtro por dificuldade
      if (dificuldade) {
        query = query.eq('dificuldade', dificuldade);
      }
      
      // Filtro por tempo
      if (tempoMax) {
        query = query.lte('tempo_minutos', tempoMax);
      }
      
      // Filtro por ingredientes (se fornecidos)
      if (ingredientes && ingredientes.length > 0) {
        const ingredientesFilter = ingredientes.map(ing => 
          `ingredientes.cs.{"${ing.toLowerCase()}"}`
        ).join(',');
        query = query.or(ingredientesFilter);
      }
      
      query = query.limit(limite);
      
      const { data: receitas, error } = await query;

      if (error) {
        console.error('❌ Erro na busca avançada:', error);
        return { receitasLocais: [], totalLocal: 0, tempoResposta: Date.now() - tempoInicio };
      }

      const receitasFormatadas = receitas?.map(this.formatarReceitaLocal) || [];
      
      console.log(`✅ Busca avançada: ${receitasFormatadas.length} receitas encontradas`);
      
      return {
        receitasLocais: receitasFormatadas,
        totalLocal: receitasFormatadas.length,
        tempoResposta: Date.now() - tempoInicio
      };

    } catch (error) {
      console.error('❌ Erro na busca avançada:', error);
      return { receitasLocais: [], totalLocal: 0, tempoResposta: Date.now() - tempoInicio };
    }
  }

  // Salvar receita externa no banco local
  static async salvarReceitaExterna(receita: any, fonte: 'mealdb' | 'ia'): Promise<string | null> {
    try {
      console.log('💾 Salvando receita externa:', receita.nome);
      
      const { data, error } = await supabase
        .from('receitas')
        .insert({
          nome: receita.nome,
          descricao: receita.descricao || `Receita ${receita.nome}`,
          ingredientes: receita.ingredientes,
          instrucoes: receita.instrucoes,
          tempo_minutos: this.parseTempoParaMinutos(receita.tempoEstimado),
          dificuldade: receita.dificuldade,
          categoria: receita.categoria,
          area_culinaria: receita.origem,
          imagem_url: receita.imagem,
          tags: receita.tags,
          fonte_externa_id: receita.id,
          fonte_tipo: fonte
        })
        .select('id')
        .single();

      if (error) {
        console.error('❌ Erro ao salvar receita externa:', error);
        return null;
      }

      console.log('✅ Receita salva com ID:', data?.id);
      return data?.id || null;

    } catch (error) {
      console.error('❌ Erro ao salvar receita externa:', error);
      return null;
    }
  }

  // Verificar se receita externa já existe
  static async verificarReceitaExiste(fonte: string, fonteId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('receitas')
        .select('id')
        .eq('fonte_tipo', fonte)
        .eq('fonte_externa_id', fonteId)
        .single();

      if (error) {
        return false;
      }

      return !!data;
    } catch (error) {
      return false;
    }
  }

  // Obter estatísticas do banco
  static async obterEstatisticas() {
    try {
      const { data: totalReceitas } = await supabase
        .from('receitas')
        .select('id', { count: 'exact' });

      const { data: totalFavoritos } = await supabase
        .from('receitas_favoritas')
        .select('id', { count: 'exact' });

      const { data: receitasPopulares } = await supabase
        .from('receitas')
        .select('nome, categoria')
        .limit(5);

      return {
        totalReceitas: totalReceitas?.length || 0,
        totalFavoritos: totalFavoritos?.length || 0,
        receitasPopulares: receitasPopulares || []
      };
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas:', error);
      return { totalReceitas: 0, totalFavoritos: 0, receitasPopulares: [] };
    }
  }

  // Formatar receita do banco para resposta padronizada
  private static formatarReceitaLocal(receita: any): ReceitaLocal {
    return {
      id: receita.id,
      nome: receita.nome,
      descricao: receita.descricao,
      ingredientes: receita.ingredientes || [],
      instrucoes: receita.instrucoes,
      tempo_minutos: receita.tempo_minutos,
      dificuldade: receita.dificuldade,
      categoria: receita.categoria,
      area_culinaria: receita.area_culinaria,
      imagem_url: receita.imagem_url,
      tags: receita.tags || [],
      created_at: receita.created_at,
      user_id: receita.user_id,
      fonte_externa_id: receita.fonte_externa_id,
      fonte_tipo: receita.fonte_tipo || 'local'
    };
  }

  // Converter tempo em string para minutos
  private static parseTempoParaMinutos(tempo: string): number {
    if (!tempo) return 30; // padrão
    
    const tempoLower = tempo.toLowerCase();
    
    if (tempoLower.includes('15-30')) return 25;
    if (tempoLower.includes('30-45')) return 37;
    if (tempoLower.includes('45-60')) return 52;
    if (tempoLower.includes('60min+')) return 75;
    
    // Tentar extrair número
    const match = tempo.match(/(\d+)/);
    if (match && match[1]) {
      return parseInt(match[1]);
    }
    
    return 30; // padrão
  }
}

export type { ReceitaLocal, ResultadoBuscaHibrida };