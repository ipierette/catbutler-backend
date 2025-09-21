#!/usr/bin/env node
/**
 * 🚑 SOLUÇÃO DE EMERGÊNCIA
 * Cria usuário via service role com mais controle
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

console.log('🚑 Solução de Emergência - Criação de Usuário\n');

// Usar service role para ter mais permissões
const adminSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function emergencyUserCreation() {
  try {
    console.log('1️⃣ Tentando criar usuário via Admin API...');
    
    const userData = {
      email: 'admin@catbutler.com',
      password: 'catbutler123',
      email_confirm: true,
      user_metadata: {
        display_name: 'Admin CatButler'
      }
    };
    
    console.log(`   Email: ${userData.email}`);
    console.log('   Usando service role para bypass de triggers...');
    
    // Método 1: Admin.createUser (mais direto)
    const { data, error } = await adminSupabase.auth.admin.createUser(userData);
    
    if (error) {
      console.log(`   ❌ Admin.createUser falhou: ${error.message}`);
      
      // Método 2: Tentar via SQL direto
      console.log('\n2️⃣ Tentando via SQL direto...');
      
      const { data: sqlData, error: sqlError } = await adminSupabase.rpc('create_user_direct', {
        user_email: userData.email,
        user_password: userData.password
      });
      
      if (sqlError) {
        console.log(`   ❌ SQL direto falhou: ${sqlError.message}`);
        
        // Método 3: Inserção manual na tabela
        console.log('\n3️⃣ Tentando inserção manual...');
        
        try {
          // Primeiro inserir o usuário auth
          const userId = crypto.randomUUID();
          
          const { error: insertError } = await adminSupabase
            .from('auth.users')
            .insert([{
              id: userId,
              email: userData.email,
              encrypted_password: `encrypted_${userData.password}`, // Simplificado
              email_confirmed_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]);
          
          if (insertError) {
            console.log(`   ❌ Inserção manual falhou: ${insertError.message}`);
          } else {
            console.log('   ✅ Usuário inserido manualmente!');
          }
          
        } catch (insertErr) {
          console.log(`   ❌ Erro na inserção: ${insertErr.message}`);
        }
        
      } else {
        console.log('   ✅ SQL direto funcionou!');
        console.log(`   Data: ${JSON.stringify(sqlData, null, 2)}`);
      }
      
    } else {
      console.log('   ✅ Admin.createUser funcionou!');
      console.log(`   User ID: ${data.user.id}`);
      console.log(`   Email: ${data.user.email}`);
      console.log(`   Confirmed: ${!!data.user.email_confirmed_at}`);
      
      // Tentar criar perfil automaticamente
      console.log('\n4️⃣ Criando perfil do usuário...');
      
      const { data: profileData, error: profileError } = await adminSupabase
        .from('user_profiles')
        .insert([{
          id: data.user.id,
          display_name: userData.user_metadata.display_name,
          theme: 'auto'
        }])
        .select()
        .single();
      
      if (profileError) {
        console.log(`   ⚠️ Erro ao criar perfil: ${profileError.message}`);
        console.log('   (Isso é ok, perfil pode ser criado depois via backend)');
      } else {
        console.log('   ✅ Perfil criado!');
        console.log(`   Profile: ${JSON.stringify(profileData, null, 2)}`);
      }
      
      return true;
    }
    
    return false;
    
  } catch (error) {
    console.error('🚨 Erro geral:', error);
    return false;
  }
}

// Função para testar login após criação
async function testLogin() {
  console.log('\n5️⃣ Testando login do usuário criado...');
  
  const normalSupabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  
  try {
    const { data, error } = await normalSupabase.auth.signInWithPassword({
      email: 'admin@catbutler.com',
      password: 'catbutler123'
    });
    
    if (error) {
      console.log(`   ❌ Login falhou: ${error.message}`);
      return false;
    }
    
    console.log('   ✅ Login funcionando!');
    console.log(`   User: ${data.user.email}`);
    console.log(`   Session: ${data.session.access_token.substring(0, 50)}...`);
    
    return true;
    
  } catch (error) {
    console.log(`   ❌ Erro no teste de login: ${error.message}`);
    return false;
  }
}

// Executar solução completa
async function runEmergencySolution() {
  const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log(`Service Role Available: ${hasServiceRole ? '✅ YES' : '❌ NO'}`);
  
  if (!hasServiceRole) {
    console.log('\n⚠️ SUPABASE_SERVICE_ROLE_KEY não encontrada');
    console.log('   Usando ANON_KEY (menos permissões)');
  }
  
  console.log('');
  
  const userCreated = await emergencyUserCreation();
  
  if (userCreated) {
    const loginWorking = await testLogin();
    
    if (loginWorking) {
      console.log('\n🎉 SUCESSO TOTAL!');
      console.log('✅ Usuário criado via service role');
      console.log('✅ Login funcionando');
      console.log('✅ Frontend pronto para testar');
      
      console.log('\n📋 PRÓXIMOS PASSOS:');
      console.log('1. cd ../catbutler-frontend');
      console.log('2. npm run dev');
      console.log('3. Login com: admin@catbutler.com / catbutler123');
      
    } else {
      console.log('\n⚠️ Usuário criado mas login não funciona');
      console.log('   Pode ser problema de confirmação de email');
    }
  } else {
    console.log('\n❌ Falha na criação do usuário');
    console.log('   Vamos precisar tentar outras soluções...');
  }
}

runEmergencySolution().catch(console.error);