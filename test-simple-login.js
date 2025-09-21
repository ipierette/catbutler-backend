#!/usr/bin/env node
/**
 * 🧪 TESTE SIMPLES - Login com usuário existente
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '/Users/Izadora1/Desktop/programacao/projetos/catbutler/catbutler-backend/.env.local' });

console.log('🐱 CatButler - Teste de Login Simples\n');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function testSimpleLogin() {
  try {
    // Tentar login com credenciais que devem ser criadas manualmente no Supabase
    console.log('1️⃣ Testando login com usuário manual...');
    
    const testEmail = 'admin@catbutler.com';
    const testPassword = 'catbutler123';
    
    console.log(`   Email: ${testEmail}`);
    console.log('   Tentando login...');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (error) {
      console.log(`   ❌ Login falhou: ${error.message}`);
      
      if (error.message.includes('Invalid login credentials')) {
        console.log('\n🔧 SOLUÇÃO:');
        console.log('   1. Acesse: https://supabase.com/dashboard/project/htmcbeidfvjjmwsuahdq');
        console.log('   2. Vá em "Authentication" > "Users"');
        console.log('   3. Clique "Add user"');
        console.log(`   4. Email: ${testEmail}`);
        console.log(`   5. Password: ${testPassword}`);
        console.log('   6. Email Confirm: ✅ Ativado');
        console.log('   7. Execute este teste novamente');
      }
      
      return false;
    }
    
    console.log('   ✅ Login funcionando!');
    console.log(`   User ID: ${data.user.id}`);
    console.log(`   Email: ${data.user.email}`);
    console.log(`   Token: ${data.session.access_token.substring(0, 50)}...`);
    
    // 2️⃣ Testar perfil do usuário
    console.log('\n2️⃣ Testando perfil do usuário...');
    
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
    
    if (profileError && profileError.code !== 'PGRST116') {
      console.log(`   ❌ Erro ao buscar perfil: ${profileError.message}`);
      return false;
    }
    
    if (!profile) {
      console.log('   📝 Perfil não existe, criando...');
      
      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert([{
          id: data.user.id,
          display_name: data.user.email.split('@')[0],
          theme: 'auto'
        }])
        .select()
        .single();
        
      if (createError) {
        console.log(`   ❌ Erro ao criar perfil: ${createError.message}`);
        return false;
      }
      
      console.log('   ✅ Perfil criado automaticamente!');
      console.log(`   Profile: ${JSON.stringify(newProfile, null, 2)}`);
    } else {
      console.log('   ✅ Perfil já existe!');
      console.log(`   Profile: ${JSON.stringify(profile, null, 2)}`);
    }
    
    console.log('\n🎉 TESTE COMPLETO!');
    console.log('✅ Login: Funcionando');
    console.log('✅ Perfil: Funcionando'); 
    console.log('✅ Integração: Pronta!');
    
    console.log('\n📋 PRÓXIMOS PASSOS:');
    console.log('1. Iniciar frontend: cd ../catbutler-frontend && npm run dev');
    console.log('2. Testar login na interface web');
    console.log('3. Verificar se consegue acessar as páginas autenticadas');
    
    return true;
    
  } catch (error) {
    console.error('🚨 Erro geral:', error);
    return false;
  }
}

testSimpleLogin().catch(console.error);