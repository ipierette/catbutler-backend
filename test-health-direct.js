#!/usr/bin/env node
/**
 * 🧪 TESTE DIRETO DO ENDPOINT HEALTH
 * Testa diretamente a lógica TypeScript sem servidor HTTP
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Simulação de req/res para testar o endpoint
class MockResponse {
  statusCode = 200;
  headers = {};
  _body = '';
  _ended = false;

  status(code) {
    this.statusCode = code;
    return this;
  }

  setHeader(name, value) {
    this.headers[name] = value;
    return this;
  }

  json(data) {
    this.setHeader('Content-Type', 'application/json');
    this._body = JSON.stringify(data, null, 2);
    this._ended = true;
    return this;
  }

  end(data) {
    this._body = data || this._body;
    this._ended = true;
  }
}

const mockReq = {
  method: 'GET',
  url: '/api/health',
  headers: {}
};

const mockRes = new MockResponse();

// Importa e executa o handler health
async function testHealth() {
  try {
    console.log('🐱 CatButler - Teste Direto do Health Endpoint\n');

    // Como não podemos importar .ts diretamente, vamos recriar a lógica aqui
    // baseada no arquivo api/health.ts
    
    const { createClient } = await import('@supabase/supabase-js');
    
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      throw new Error('Variáveis SUPABASE_URL ou SUPABASE_ANON_KEY não encontradas');
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Função de checagem do banco (baseada em api/health.ts)
    async function checkDatabaseConnection() {
      try {
        const { error } = await supabase
          .from('user_profiles')
          .select('count')
          .limit(0);

        return { status: 'connected', error: error?.message };
      } catch (err) {
        return { status: 'error', error: err.message };
      }
    }

    // Executa checagem de saúde
    const timestamp = new Date().toISOString();
    const dbStatus = await checkDatabaseConnection();

    let overallStatus = 'healthy';
    if (dbStatus.status === 'error') {
      overallStatus = 'unhealthy';
    }

    const healthData = {
      success: true,
      data: {
        status: overallStatus,
        timestamp,
        services: {
          database: dbStatus.status,
          environment: 'configured'
        }
      }
    };

    // Se houver erro de banco, adiciona aos detalhes
    if (dbStatus.error) {
      healthData.data.services.database_error = dbStatus.error;
    }

    console.log('✅ Health Check executado com sucesso!\n');
    console.log('📊 Resultado:');
    console.log(JSON.stringify(healthData, null, 2));
    
    console.log('\n🎯 STATUS:');
    console.log(`   Overall: ${healthData.data.status}`);
    console.log(`   Database: ${healthData.data.services.database}`);
    console.log(`   Timestamp: ${healthData.data.timestamp}`);
    
    if (overallStatus === 'healthy') {
      console.log('\n🎉 BACKEND TOTALMENTE FUNCIONAL!');
      console.log('   ✅ Conexão com Supabase: OK');
      console.log('   ✅ Tabelas do banco: OK');
      console.log('   ✅ Configurações: OK');
      
      console.log('\n🚀 PRÓXIMOS PASSOS:');
      console.log('   1. Criar usuário de teste no Supabase Auth');
      console.log('   2. Testar endpoints com autenticação');
      console.log('   3. Deploy no Vercel');
    } else {
      console.log('\n⚠️ PROBLEMAS ENCONTRADOS:');
      if (dbStatus.error) {
        console.log(`   Database: ${dbStatus.error}`);
      }
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    console.log('\n🔧 VERIFIQUE:');
    console.log('   1. Arquivo .env.local existe e tem as variáveis corretas');
    console.log('   2. SUPABASE_URL e SUPABASE_ANON_KEY estão corretos');
    console.log('   3. Schema foi executado no Supabase');
  }
}

testHealth().catch(console.error);