import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { withCors } from '../_lib/cors';

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const handler = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }

  try {
    console.log('🧪 Iniciando teste de favoritos...');

    const tests = [];

    // 1. Verificar se as tabelas existem
    try {
      const { data: receitas, error: receitasError } = await supabase
        .from('receitas')
        .select('count')
        .limit(1);

      const { data: favoritos, error: favoritosError } = await supabase
        .from('receitas_favoritas')
        .select('count')
        .limit(1);

      tests.push({
        test: 'Tabelas existem',
        receitas_table: !receitasError,
        favoritos_table: !favoritosError,
        receitas_error: receitasError?.message,
        favoritos_error: favoritosError?.message
      });
    } catch (error) {
      tests.push({
        test: 'Tabelas existem',
        error: error.message
      });
    }

    // 2. Contar receitas
    try {
      const { data, error } = await supabase
        .from('receitas')
        .select('id, nome, fonte, ativo')
        .eq('ativo', true);

      tests.push({
        test: 'Contar receitas ativas',
        count: data?.length || 0,
        receitas: data?.slice(0, 3) || [],
        error: error?.message
      });
    } catch (error) {
      tests.push({
        test: 'Contar receitas ativas',
        error: error.message
      });
    }

    // 3. Contar favoritos
    try {
      const { data, error } = await supabase
        .from('receitas_favoritas')
        .select('id, user_id, receita_id');

      tests.push({
        test: 'Contar favoritos',
        count: data?.length || 0,
        favoritos: data?.slice(0, 3) || [],
        error: error?.message
      });
    } catch (error) {
      tests.push({
        test: 'Contar favoritos',
        error: error.message
      });
    }

    // 4. Verificar RLS
    try {
      const { data: policies, error } = await supabase
        .rpc('get_policies_info');

      tests.push({
        test: 'RLS Policies',
        policies_available: !error,
        error: error?.message
      });
    } catch (error) {
      tests.push({
        test: 'RLS Policies',
        note: 'RPC não disponível (normal)',
        error: error.message
      });
    }

    // 5. Teste de autenticação
    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        tests.push({
          test: 'Autenticação',
          authenticated: !authError && !!user,
          user_id: user?.id,
          user_email: user?.email,
          error: authError?.message
        });
      } catch (error) {
        tests.push({
          test: 'Autenticação',
          error: error.message
        });
      }
    } else {
      tests.push({
        test: 'Autenticação',
        note: 'Sem token Authorization header'
      });
    }

    // 6. Configuração de ambiente
    tests.push({
      test: 'Variáveis de ambiente',
      supabase_url: !!process.env.SUPABASE_URL,
      supabase_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabase_url_value: process.env.SUPABASE_URL ? 'Definida' : 'Não definida'
    });

    const response = {
      success: true,
      message: 'Teste de favoritos concluído',
      timestamp: new Date().toISOString(),
      tests,
      summary: {
        total_tests: tests.length,
        tests_with_errors: tests.filter(t => t.error).length
      }
    };

    console.log('✅ Teste de favoritos concluído:', response.summary);
    res.status(200).json(response);

  } catch (error) {
    console.error('❌ Erro no teste de favoritos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
};

export default withCors(handler);
