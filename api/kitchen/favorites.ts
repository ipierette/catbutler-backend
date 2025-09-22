import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { withCors } from '../_lib/cors';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

interface FavoritoRequestExpandido {
  receita_id?: string;
  
  // Dados completos da receita (para auto-criação)
  nome?: string;
  categoria?: string;
  origem?: string;
  instrucoes?: string;
  ingredientes?: string[];
  tempo_estimado?: string;
  dificuldade?: string;
  imagem_url?: string;
  fonte?: string;
  
  // Dados do favorito
  notas?: string;
  rating?: number;
  tags_pessoais?: string[];
  colecao?: string;
}

const handler = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  try {
    // Verificar autenticação
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: 'Token de autorização necessário' });
      return;
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      res.status(401).json({ error: 'Token inválido' });
      return;
    }

    const userId = user.id;

    // Routing baseado no método HTTP
    switch (req.method) {
      case 'GET':
        await handleGetFavoritos(req, res, userId);
        return;
      case 'POST':
        await handleAddFavorito(req, res, userId);
        return;
      case 'DELETE':
        await handleRemoveFavorito(req, res, userId);
        return;
      default:
        res.status(405).json({ error: 'Método não permitido' });
        return;
    }

  } catch (error) {
    console.error('❌ Erro na API de favoritos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// GET - Listar favoritos
async function handleGetFavoritos(req: VercelRequest, res: VercelResponse, userId: string) {
  try {
    const { data, error } = await supabase
      .from('receitas_favoritas')
      .select(`
        *,
        receitas (
          id, nome, categoria, origem, imagem_url, 
          tempo_estimado, dificuldade, fonte, fonte_url
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: { favoritos: data || [], total: data?.length || 0 }
    });

  } catch (error) {
    console.error('❌ Erro ao listar favoritos:', error);
    res.status(500).json({ error: 'Erro ao buscar favoritos' });
    return;
  }
}

// POST - Adicionar favorito (com auto-criação de receita)
async function handleAddFavorito(req: VercelRequest, res: VercelResponse, userId: string): Promise<void> {
  try {
    const dados: FavoritoRequestExpandido = req.body;
    
    let receitaId = dados.receita_id;
    
    // Se não tem receita_id mas tem dados da receita, criar receita primeiro
    if (!receitaId && dados.nome && dados.ingredientes) {
      console.log('🔄 Criando receita automaticamente:', dados.nome);
      
      const { data: novaReceita, error: receitaError } = await supabase
        .from('receitas')
        .insert({
          nome: dados.nome,
          categoria: dados.categoria || 'Diversos',
          origem: dados.origem || 'Chef Bruno IA',
          instrucoes: dados.instrucoes || 'Instruções não disponíveis',
          ingredientes: dados.ingredientes,
          tempo_estimado: dados.tempo_estimado || '30min',
          dificuldade: dados.dificuldade || 'Médio',
          imagem_url: dados.imagem_url || '/images/receita-placeholder.jpg',
          fonte: dados.fonte || 'ia',
          ativo: true,
          verificado: dados.fonte !== 'ia'
        })
        .select('id')
        .single();
        
      if (receitaError) throw receitaError;
      receitaId = novaReceita.id;
      console.log('✅ Receita criada com ID:', receitaId);
    }
    
    if (!receitaId) {
      res.status(400).json({ error: 'receita_id é obrigatório ou forneça dados completos da receita' });
      return;
    }

    // Adicionar aos favoritos
    const { data, error } = await supabase
      .from('receitas_favoritas')
      .insert({
        user_id: userId,
        receita_id: receitaId,
        notas: dados.notas,
        rating: dados.rating,
        tags_pessoais: dados.tags_pessoais,
        colecao: dados.colecao || 'Favoritos'
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Favorito adicionado com sucesso',
      data
    });

  } catch (error) {
    console.error('❌ Erro ao adicionar favorito:', error);
    res.status(500).json({ error: 'Erro ao adicionar favorito' });
    return;
  }
}

// DELETE - Remover favorito
async function handleRemoveFavorito(req: VercelRequest, res: VercelResponse, userId: string): Promise<void> {
  try {
    const { id } = req.body;
    
    if (!id) {
      res.status(400).json({ error: 'ID do favorito é obrigatório' });
      return;
    }

    const { error } = await supabase
      .from('receitas_favoritas')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Favorito removido com sucesso'
    });

  } catch (error) {
    console.error('❌ Erro ao remover favorito:', error);
    res.status(500).json({ error: 'Erro ao remover favorito' });
    return;
  }
}

export default withCors(handler);