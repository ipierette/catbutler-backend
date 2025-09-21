import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase (corrigido para SUPABASE_URL)
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface ReceitaFavorita {
  id: string;
  user_id: string;
  receita_id: string;
  notas?: string;
  rating?: number;
  tags_pessoais?: string[];
  coleção?: string;
  created_at: string;
  updated_at: string;
}

interface FavoritoRequest {
  receita_id: string;
  notas?: string;
  rating?: number;
  tags_pessoais?: string[];
  coleção?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configurar CORS
  // CORS: Permitir apenas a URL do frontend de produção
  const allowedOrigin = process.env.FRONTEND_URL || 'https://catbutler-frontend.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Token de autorização necessário' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const userId = user.id;

    // Routing baseado no método HTTP
    switch (req.method) {
      case 'GET':
        return handleGetFavoritos(req, res, userId);
      case 'POST':
        return handleAddFavorito(req, res, userId);
      case 'PUT':
        return handleUpdateFavorito(req, res, userId);
      case 'DELETE':
        return handleRemoveFavorito(req, res, userId);
      default:
        return res.status(405).json({ error: 'Método não permitido' });
    }

  } catch (error) {
    console.error('❌ Erro na API de favoritos:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor' 
    });
  }
}

// GET - Listar favoritos do usuário
async function handleGetFavoritos(req: VercelRequest, res: VercelResponse, userId: string) {
  try {
    const { coleção } = req.query;

    let query = supabase
      .from('receitas_favoritas')
      .select(`
        *,
        receitas (
          id,
          nome,
          categoria,
          origem,
          imagem_url,
          tempo_estimado,
          dificuldade,
          fonte
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (coleção && typeof coleção === 'string') {
      query = query.eq('coleção', coleção);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar favoritos:', error);
      return res.status(500).json({ error: 'Erro ao buscar favoritos' });
    }

    return res.status(200).json({
      success: true,
      data: {
        favoritos: data || [],
        total: data?.length || 0
      }
    });

  } catch (error) {
    console.error('Erro em handleGetFavoritos:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
}

// POST - Adicionar receita aos favoritos
async function handleAddFavorito(req: VercelRequest, res: VercelResponse, userId: string) {
  try {
    const { 
      receita_id, 
      notas, 
      rating, 
      tags_pessoais, 
      coleção = 'Favoritos' 
    }: FavoritoRequest = req.body;

    if (!receita_id) {
      return res.status(400).json({ error: 'receita_id é obrigatório' });
    }

    // Verificar se a receita existe
    const { data: receita, error: receitaError } = await supabase
      .from('receitas')
      .select('id')
      .eq('id', receita_id)
      .single();

    if (receitaError || !receita) {
      return res.status(404).json({ error: 'Receita não encontrada' });
    }

    // Inserir favorito
    const { data, error } = await supabase
      .from('receitas_favoritas')
      .insert({
        user_id: userId,
        receita_id,
        notas,
        rating,
        tags_pessoais,
        coleção
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({ error: 'Receita já está nos favoritos' });
      }
      console.error('Erro ao adicionar favorito:', error);
      return res.status(500).json({ error: 'Erro ao adicionar favorito' });
    }

    return res.status(201).json({
      success: true,
      data: { favorito: data }
    });

  } catch (error) {
    console.error('Erro em handleAddFavorito:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
}

// PUT - Atualizar favorito
async function handleUpdateFavorito(req: VercelRequest, res: VercelResponse, userId: string) {
  try {
    const { receita_id } = req.query;
    const { notas, rating, tags_pessoais, coleção } = req.body;

    if (!receita_id) {
      return res.status(400).json({ error: 'receita_id é obrigatório' });
    }

    const { data, error } = await supabase
      .from('receitas_favoritas')
      .update({
        ...(notas !== undefined && { notas }),
        ...(rating !== undefined && { rating }),
        ...(tags_pessoais !== undefined && { tags_pessoais }),
        ...(coleção !== undefined && { coleção })
      })
      .eq('user_id', userId)
      .eq('receita_id', receita_id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar favorito:', error);
      return res.status(500).json({ error: 'Erro ao atualizar favorito' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Favorito não encontrado' });
    }

    return res.status(200).json({
      success: true,
      data: { favorito: data }
    });

  } catch (error) {
    console.error('Erro em handleUpdateFavorito:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
}

// DELETE - Remover dos favoritos
async function handleRemoveFavorito(req: VercelRequest, res: VercelResponse, userId: string) {
  try {
    const { receita_id } = req.query;

    if (!receita_id) {
      return res.status(400).json({ error: 'receita_id é obrigatório' });
    }

    const { error } = await supabase
      .from('receitas_favoritas')
      .delete()
      .eq('user_id', userId)
      .eq('receita_id', receita_id);

    if (error) {
      console.error('Erro ao remover favorito:', error);
      return res.status(500).json({ error: 'Erro ao remover favorito' });
    }

    return res.status(200).json({
      success: true,
      message: 'Receita removida dos favoritos'
    });

  } catch (error) {
    console.error('Erro em handleRemoveFavorito:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
}