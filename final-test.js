#!/usr/bin/env node
/**
 * 🔥 TESTE FINAL - Com triggers desabilitados
 * Última tentativa antes de criar novo projeto
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const adminSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

console.log('🔥 Teste Final - Com Triggers Desabilitados\n');

async function finalTest() {
  try {
    console.log('1️⃣ Testando signup básico...');
    
    const testEmail = `final-test-${Date.now()}@catbutler.com`;
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: '123456789'
    });
    
    if (error) {
      console.log(`   ❌ Signup ainda falha: ${error.message}`);
      
      console.log('\n2️⃣ Tentando criar usuário manual via dashboard...');
      console.log('   Acesse: https://supabase.com/dashboard/project/htmcbeidfvjjmwsuahdq/auth/users');
      console.log('   Clique "Add user"');
      console.log('   Email: admin@catbutler.com');
      console.log('   Password: catbutler123'); 
      console.log('   Auto Confirm User: ✅ ATIVADO');
      
      // Aguardar um pouco para usuário criar
      console.log('\n   ⏳ Aguardando você criar o usuário...');
      console.log('   (Pressione Ctrl+C se não conseguir criar)');
      
      // Aguardar 30 segundos e tentar login
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      console.log('\n3️⃣ Testando login com usuário manual...');
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'admin@catbutler.com',
        password: 'catbutler123'
      });
      
      if (loginError) {
        console.log(`   ❌ Login manual falhou: ${loginError.message}`);
        console.log('\n🚨 CONCLUSÃO: Projeto Supabase tem problemas fundamentais');
        console.log('   RECOMENDAÇÃO: Criar novo projeto Supabase');
        return false;
      } else {
        console.log('   ✅ Login manual funcionou!');
        console.log(`   User: ${loginData.user.email}`);
        return true;
      }
      
    } else {
      console.log('   ✅ Signup funcionou após desabilitar triggers!');
      console.log(`   User: ${data.user.email}`);
      console.log(`   Needs confirmation: ${!data.session}`);
      
      // Reativar triggers
      console.log('\n4️⃣ Reativando triggers...');
      console.log('   Execute no SQL: ALTER TABLE auth.users ENABLE TRIGGER ALL;');
      
      return true;
    }
    
  } catch (error) {
    console.error('🚨 Erro final:', error);
    return false;
  }
}

async function runFinalTest() {
  console.log('📋 INSTRUÇÕES:');
  console.log('1. Execute no SQL Editor: ALTER TABLE auth.users DISABLE TRIGGER ALL;');
  console.log('2. Aguarde este script testar signup');
  console.log('3. Se falhar, crie usuário manual no dashboard');
  console.log('');
  
  const success = await finalTest();
  
  if (success) {
    console.log('\n🎉 SUCESSO! Problema resolvido!');
    console.log('📋 PRÓXIMOS PASSOS:');
    console.log('1. Reativar triggers: ALTER TABLE auth.users ENABLE TRIGGER ALL;');
    console.log('2. Testar frontend: cd ../catbutler-frontend && npm run dev');
    console.log('3. Login com: admin@catbutler.com / catbutler123');
    
  } else {
    console.log('\n💔 Todas as tentativas falharam');
    console.log('🆘 SOLUÇÃO FINAL: Criar novo projeto Supabase');
    console.log('   1. Novo projeto em 5 minutos');
    console.log('   2. Copiar schema.sql');  
    console.log('   3. Atualizar credenciais');
    console.log('   4. Tudo funcionando!');
  }
}

runFinalTest().catch(console.error);