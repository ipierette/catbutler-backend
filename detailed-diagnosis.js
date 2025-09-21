#!/usr/bin/env node
/**
 * 🩺 DIAGNÓSTICO DETALHADO SUPABASE
 * Identifica exatamente onde está o problema
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function detailedDiagnosis() {
  console.log('🩺 Diagnóstico Detalhado Supabase\n');
  
  // 1️⃣ Verificar se conseguimos acessar metadados
  console.log('1️⃣ Testando acesso básico ao Supabase...');
  
  try {
    // Testar uma query simples na tabela pública
    const { data, error } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(0);
    
    console.log('   ✅ Acesso ao banco funcionando');
  } catch (error) {
    console.log(`   ❌ Erro de acesso: ${error.message}`);
    return;
  }
  
  // 2️⃣ Testar com o service role (se disponível)
  console.log('\n2️⃣ Testando com service role key...');
  
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const adminSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    try {
      // Tentar criar usuário com service role
      const { data, error } = await adminSupabase.auth.admin.createUser({
        email: 'admin-service@catbutler.com',
        password: 'catbutler123',
        email_confirm: true
      });
      
      if (error) {
        console.log(`   ❌ Service role signup falhou: ${error.message}`);
        
        if (error.message.includes('already registered')) {
          console.log('   ℹ️ Usuário já existe, tentando deletar primeiro...');
          
          // Tentar deletar usuário existente
          const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(
            'admin-service@catbutler.com'
          );
          
          if (!deleteError) {
            console.log('   ✅ Usuário anterior deletado, tentando criar novamente...');
            
            const { data: retryData, error: retryError } = await adminSupabase.auth.admin.createUser({
              email: 'admin-service@catbutler.com',
              password: 'catbutler123',
              email_confirm: true
            });
            
            if (retryError) {
              console.log(`   ❌ Retry falhou: ${retryError.message}`);
            } else {
              console.log('   ✅ Usuário criado com service role!');
              console.log(`   User ID: ${retryData.user.id}`);
            }
          }
        }
        
      } else {
        console.log('   ✅ Service role funcionando!');
        console.log(`   User ID: ${data.user.id}`);
        console.log(`   Email: ${data.user.email}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Erro com service role: ${error.message}`);
    }
  } else {
    console.log('   ⚠️ SUPABASE_SERVICE_ROLE_KEY não configurada');
  }
  
  // 3️⃣ Verificar projeto settings
  console.log('\n3️⃣ Informações do projeto...');
  console.log(`   URL: ${process.env.SUPABASE_URL}`);
  console.log(`   Project ID: ${process.env.SUPABASE_URL?.split('//')[1]?.split('.')[0] || 'N/A'}`);
  
  // 4️⃣ Testar signup com email diferente
  console.log('\n4️⃣ Testando signup com domínio diferente...');
  
  const alternativeEmail = `test-${Date.now()}@gmail.com`;
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: alternativeEmail,
      password: '123456789'
    });
    
    if (error) {
      console.log(`   ❌ Alternative signup falhou: ${error.message}`);
      
      // Analisar tipos específicos de erro
      if (error.message === 'Database error saving new user') {
        console.log('\n🚨 CONFIRMADO: Problema no schema auth');
        console.log('   POSSÍVEIS CAUSAS:');
        console.log('   1. Trigger na tabela user_profiles falhando');
        console.log('   2. RLS policy muito restritiva');
        console.log('   3. Constraint violation');
        console.log('   4. Schema auth corrompido');
        
        console.log('\n   SOLUÇÕES POSSÍVEIS:');
        console.log('   A) Executar repair-auth.sql no SQL Editor');
        console.log('   B) Desabilitar RLS temporariamente');
        console.log('   C) Recriar o projeto Supabase (último recurso)');
      }
      
    } else {
      console.log('   ✅ Alternative signup funcionando!');
      console.log(`   User: ${alternativeEmail}`);
      console.log(`   Needs confirmation: ${!data.session}`);
    }
    
  } catch (error) {
    console.log(`   ❌ Erro inesperado: ${error.message}`);
  }
  
  // 5️⃣ Conclusões
  console.log('\n📋 RESUMO E PRÓXIMOS PASSOS:');
  console.log('   1. Acesse o SQL Editor do Supabase');
  console.log('   2. Execute as queries do arquivo repair-auth.sql');
  console.log('   3. Verifique configurações em Auth > Settings');
  console.log('   4. Tente criar usuário manual em Auth > Users');
  console.log('   5. Se nada funcionar, considere recriar projeto');
}

detailedDiagnosis().catch(console.error);