#!/usr/bin/env node
/**
 * 🔧 DIAGNÓSTICO SUPABASE AUTH
 * Identifica e resolve problemas de criação de usuários
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

console.log('🔧 Diagnóstico Supabase Auth\n');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function diagnoseAuth() {
  try {
    console.log('1️⃣ Verificando configurações de Auth...');
    
    // Teste 1: Tentar obter configurações públicas de auth
    try {
      const { data, error } = await supabase.auth.getSession();
      console.log('   ✅ Auth client inicializado');
    } catch (error) {
      console.log(`   ❌ Erro no auth client: ${error.message}`);
    }
    
    // Teste 2: Verificar se signup está habilitado
    console.log('\n2️⃣ Testando signup básico...');
    
    const testEmail = `teste-${Date.now()}@catbutler.com`;
    const testPassword = '123456789';
    
    console.log(`   Email de teste: ${testEmail}`);
    console.log('   Tentando signup...');
    
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    });
    
    if (error) {
      console.log(`   ❌ Signup falhou: ${error.message}`);
      
      // Analisar tipos de erro comuns
      if (error.message.includes('Signup is disabled')) {
        console.log('\n🚨 PROBLEMA IDENTIFICADO: Signup desabilitado');
        console.log('   SOLUÇÃO:');
        console.log('   1. Acesse: https://supabase.com/dashboard/project/htmcbeidfvjjmwsuahdq/auth/settings');
        console.log('   2. Na seção "User signup"');
        console.log('   3. Ative "Enable email signup"');
        console.log('   4. Desative "Enable email confirmations" (temporariamente para teste)');
        
      } else if (error.message.includes('Database error')) {
        console.log('\n🚨 PROBLEMA IDENTIFICADO: Erro de banco de dados');
        console.log('   POSSÍVEIS CAUSAS:');
        console.log('   1. Schema auth não foi aplicado corretamente');
        console.log('   2. Permissões de RLS muito restritivas');
        console.log('   3. Triggers faltando');
        
        console.log('\n   SOLUÇÃO:');
        console.log('   1. Acesse: https://supabase.com/dashboard/project/htmcbeidfvjjmwsuahdq/sql/');
        console.log('   2. Execute este comando para resetar auth:');
        console.log('   ');
        console.log('   -- Reset auth básico');
        console.log('   DELETE FROM auth.users WHERE email LIKE \'%@catbutler.com\';');
        
      } else if (error.message.includes('Invalid email')) {
        console.log('\n🚨 PROBLEMA IDENTIFICADO: Email inválido');
        console.log('   Isso é menos provável, mas verifique o formato');
        
      } else {
        console.log('\n🚨 PROBLEMA DESCONHECIDO');
        console.log('   Error details:', JSON.stringify(error, null, 2));
      }
      
      return false;
      
    } else {
      console.log('   ✅ Signup funcionando!');
      
      if (data.user && !data.session) {
        console.log('   📧 Usuário criado mas precisa confirmar email');
        console.log(`   User ID: ${data.user.id}`);
        console.log('   Email confirmation necessária');
        
      } else if (data.session) {
        console.log('   ✅ Usuário criado e logado automaticamente!');
        console.log(`   User ID: ${data.user.id}`);
        console.log(`   Session: ${data.session.access_token.substring(0, 50)}...`);
        
        // Testar se consegue acessar o perfil
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
          
        if (profileError && profileError.code !== 'PGRST116') {
          console.log(`   ⚠️ Problema ao acessar perfil: ${profileError.message}`);
        } else if (!profile) {
          console.log('   📝 Perfil ainda não existe (será criado pelo backend)');
        } else {
          console.log('   ✅ Perfil acessível');
        }
      }
      
      return true;
    }
    
  } catch (error) {
    console.error('🚨 Erro geral:', error);
    return false;
  }
}

// Função para testar signup manual (via dashboard)
async function testManualUser() {
  console.log('\n3️⃣ Testando usuário criado manualmente...');
  
  // Credenciais que devem ser criadas no dashboard
  const manualEmail = 'admin@catbutler.com';
  const manualPassword = 'catbutler123';
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: manualEmail,
      password: manualPassword
    });
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        console.log('   ℹ️ Usuário manual não existe ainda');
        console.log('   Vamos tentar criar via dashboard...');
        return false;
      } else {
        console.log(`   ❌ Erro no login manual: ${error.message}`);
        return false;
      }
    }
    
    console.log('   ✅ Usuário manual funcionando!');
    console.log(`   Email: ${data.user.email}`);
    console.log(`   ID: ${data.user.id}`);
    return true;
    
  } catch (error) {
    console.log(`   ❌ Erro inesperado: ${error.message}`);
    return false;
  }
}

// Executar diagnóstico completo
async function runDiagnosis() {
  console.log('🔍 Iniciando diagnóstico completo...\n');
  
  const signupWorking = await diagnoseAuth();
  const manualWorking = await testManualUser();
  
  console.log('\n📊 RESUMO DO DIAGNÓSTICO:');
  console.log(`   Signup automático: ${signupWorking ? '✅ Funcionando' : '❌ Com problemas'}`);
  console.log(`   Usuário manual: ${manualWorking ? '✅ Funcionando' : '❌ Não existe'}`);
  
  if (!signupWorking && !manualWorking) {
    console.log('\n🚨 AÇÃO NECESSÁRIA:');
    console.log('   1. Verificar configurações de Auth no Supabase');
    console.log('   2. Habilitar signup de email');
    console.log('   3. Criar usuário manual como backup');
    console.log('');
    console.log('   URLs úteis:');
    console.log('   📊 Dashboard: https://supabase.com/dashboard/project/htmcbeidfvjjmwsuahdq');
    console.log('   ⚙️ Auth Settings: https://supabase.com/dashboard/project/htmcbeidfvjjmwsuahdq/auth/settings');
    console.log('   👥 Users: https://supabase.com/dashboard/project/htmcbeidfvjjmwsuahdq/auth/users');
    
  } else if (signupWorking) {
    console.log('\n✅ SIGNUP FUNCIONANDO!');
    console.log('   Você pode criar usuários automaticamente');
    console.log('   Frontend e signup estão prontos para usar');
    
  } else if (manualWorking) {
    console.log('\n✅ USUÁRIO MANUAL FUNCIONANDO!');
    console.log('   Você pode usar o usuário manual para testes');
    console.log('   Mas signup automático precisa ser corrigido');
  }
}

runDiagnosis().catch(console.error);