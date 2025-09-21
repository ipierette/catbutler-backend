#!/usr/bin/env node
/**
 * 🐱 TESTE DE CONEXÃO - CatButler Backend
 * Testa a conexão com Supabase e valida configurações
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

console.log('🐱 CatButler - Teste de Conexão\n');

// 1️⃣ TESTE DE VARIÁVEIS DE AMBIENTE
console.log('1️⃣ Verificando variáveis de ambiente...');
const requiredVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('❌ Variáveis faltando:', missingVars);
    process.exit(1);
}

console.log('✅ Variáveis encontradas');
console.log(`   SUPABASE_URL: ${process.env.SUPABASE_URL}`);
console.log(`   SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY.substring(0, 50)}...`);
console.log('');

// 2️⃣ TESTE DE CONEXÃO COM SUPABASE
console.log('2️⃣ Testando conexão com Supabase...');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function testConnection() {
    try {
        // Teste básico de conectividade
        const { data, error } = await supabase
            .from('user_profiles')
            .select('count')
            .limit(0);

        if (error) {
            console.error('❌ Erro de conexão:', error.message);
            
            if (error.message.includes('table "user_profiles" does not exist')) {
                console.log('\n🔧 SOLUÇÃO:');
                console.log('   O schema não foi executado no Supabase!');
                console.log('   1. Acesse: https://supabase.com/dashboard');
                console.log('   2. Vá em SQL Editor');
                console.log('   3. Execute o arquivo: supabase/schema.sql');
                console.log('');
            }
            
            return false;
        }

        console.log('✅ Conexão com Supabase funcionando!');
        return true;

    } catch (err) {
        console.error('❌ Erro inesperado:', err.message);
        return false;
    }
}

// 3️⃣ TESTE DE TABELAS
async function testTables() {
    console.log('3️⃣ Verificando tabelas do banco...');
    
    const tables = ['user_profiles', 'tasks', 'events', 'activities'];
    
    for (const table of tables) {
        try {
            const { error } = await supabase
                .from(table)
                .select('count')
                .limit(0);
                
            if (error) {
                console.log(`❌ Tabela ${table}: ${error.message}`);
            } else {
                console.log(`✅ Tabela ${table}: OK`);
            }
        } catch (err) {
            console.log(`❌ Tabela ${table}: ${err.message}`);
        }
    }
}

// Executar testes
async function runTests() {
    const connectionOk = await testConnection();
    
    if (connectionOk) {
        await testTables();
        
        console.log('\n🎉 RESUMO:');
        console.log('✅ Conexão: Funcionando');
        console.log('✅ Configuração: OK');
        console.log('\n📋 PRÓXIMOS PASSOS:');
        console.log('   1. Se alguma tabela falhou, execute o schema SQL');
        console.log('   2. Teste o endpoint: curl http://localhost:3000/api/health');
        console.log('   3. Crie um usuário de teste no Supabase Auth');
        
    } else {
        console.log('\n🔧 VERIFIQUE:');
        console.log('   1. SUPABASE_URL está correto?');
        console.log('   2. SUPABASE_ANON_KEY está correto?');
        console.log('   3. Schema foi executado no Supabase?');
    }
}

runTests().catch(console.error);