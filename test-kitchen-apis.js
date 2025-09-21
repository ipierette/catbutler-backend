#!/usr/bin/env node

// Script de teste para as APIs da CozinhaIA
// Execute com: node test-kitchen-apis.js

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configurar variáveis de ambiente
const envPath = join(__dirname, 'env.backend');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  const envLines = envContent.split('\n').filter(line => 
    line.trim() && !line.startsWith('#') && line.includes('=')
  );
  
  envLines.forEach(line => {
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=').trim();
    if (key && value) {
      process.env[key.trim()] = value;
    }
  });
} catch (error) {
  console.error('❌ Erro ao carregar env.backend:', error.message);
  process.exit(1);
}

// URLs das APIs (assumindo desenvolvimento local)
const BASE_URL = 'http://localhost:3000/api/kitchen';
const APIs = {
  suggestions: `${BASE_URL}/suggestions`,
  chat: `${BASE_URL}/chat`,
  search: `${BASE_URL}/search`,
  favorites: `${BASE_URL}/favorites`
};

console.log('🧪 INICIANDO TESTES DAS APIs DA COZINHA IA\n');
console.log('📍 Base URL:', BASE_URL);
console.log('🔑 Tokens configurados:');
console.log('   - HF_TOKEN_COZINHA:', process.env.HF_TOKEN_COZINHA ? '✅ Configurado' : '❌ Não encontrado');
console.log('');

// Função auxiliar para fazer requests
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    const data = await response.json();
    
    return {
      status: response.status,
      ok: response.ok,
      data
    };
  } catch (error) {
    return {
      status: 500,
      ok: false,
      error: error.message
    };
  }
}

// Teste 1: API de Sugestões
async function testSuggestions() {
  console.log('🧪 TESTE 1: API de Sugestões de Receitas');
  console.log('━'.repeat(50));
  
  const testData = {
    ingredientes: ['frango', 'arroz', 'tomate']
  };
  
  console.log('📤 Enviando:', JSON.stringify(testData, null, 2));
  
  const result = await makeRequest(APIs.suggestions, {
    method: 'POST',
    body: JSON.stringify(testData)
  });
  
  console.log(`📥 Status: ${result.status} ${result.ok ? '✅' : '❌'}`);
  
  if (result.ok) {
    console.log(`🎯 Receitas encontradas: ${result.data.data?.receitas?.length || 0}`);
    console.log(`📊 Fontes: MealDB(${result.data.data?.fontes?.mealdb || 0}) + IA(${result.data.data?.fontes?.ia || 0})`);
    
    if (result.data.data?.receitas?.length > 0) {
      const primeira = result.data.data.receitas[0];
      console.log(`🍽️ Primeira receita: "${primeira.nome}" (${primeira.fonte})`);
    }
  } else {
    console.log('❌ Erro:', result.data?.error || result.error);
  }
  
  console.log('');
}

// Teste 2: API de Chat
async function testChat() {
  console.log('🧪 TESTE 2: API de Chat com Chef IA');
  console.log('━'.repeat(50));
  
  const testData = {
    mensagem: 'Como posso fazer um frango grelhado saboroso?',
    ingredientes: ['frango'],
    isVisitorMode: false
  };
  
  console.log('📤 Enviando:', JSON.stringify(testData, null, 2));
  
  const result = await makeRequest(APIs.chat, {
    method: 'POST',
    body: JSON.stringify(testData)
  });
  
  console.log(`📥 Status: ${result.status} ${result.ok ? '✅' : '❌'}`);
  
  if (result.ok) {
    console.log('🤖 Resposta da IA:');
    console.log(`"${result.data.data?.resposta?.substring(0, 150)}..."`);
    console.log(`💡 Sugestões: ${result.data.data?.sugestoes?.length || 0}`);
  } else {
    console.log('❌ Erro:', result.data?.error || result.error);
  }
  
  console.log('');
}

// Teste 3: API de Busca
async function testSearch() {
  console.log('🧪 TESTE 3: API de Busca de Receitas');
  console.log('━'.repeat(50));
  
  // Teste busca por nome
  console.log('🔍 Teste 3a: Busca por nome');
  let result = await makeRequest(`${APIs.search}?query=chicken&limit=5`);
  
  console.log(`📥 Status: ${result.status} ${result.ok ? '✅' : '❌'}`);
  if (result.ok) {
    console.log(`🍽️ Receitas encontradas: ${result.data.data?.receitas?.length || 0}`);
  }
  
  // Teste busca por ingrediente
  console.log('🔍 Teste 3b: Busca por ingrediente');
  result = await makeRequest(`${APIs.search}?ingrediente=beef&limit=3`);
  
  console.log(`📥 Status: ${result.status} ${result.ok ? '✅' : '❌'}`);
  if (result.ok) {
    console.log(`🥩 Receitas com beef: ${result.data.data?.receitas?.length || 0}`);
  }
  
  // Teste receitas aleatórias
  console.log('🔍 Teste 3c: Receitas aleatórias');
  result = await makeRequest(`${APIs.search}?limit=3`);
  
  console.log(`📥 Status: ${result.status} ${result.ok ? '✅' : '❌'}`);
  if (result.ok) {
    console.log(`🎲 Receitas aleatórias: ${result.data.data?.receitas?.length || 0}`);
  }
  
  console.log('');
}

// Teste 4: Conectividade TheMealDB
async function testTheMealDB() {
  console.log('🧪 TESTE 4: Conectividade TheMealDB');
  console.log('━'.repeat(50));
  
  try {
    const response = await fetch('https://www.themealdb.com/api/json/v1/1/search.php?s=chicken');
    const data = await response.json();
    
    console.log(`📥 Status: ${response.status} ${response.ok ? '✅' : '❌'}`);
    console.log(`🍗 Receitas de chicken: ${data.meals?.length || 0}`);
    
    if (data.meals?.[0]) {
      console.log(`📝 Primeira receita: "${data.meals[0].strMeal}"`);
    }
  } catch (error) {
    console.log('❌ Erro ao conectar TheMealDB:', error.message);
  }
  
  console.log('');
}

// Teste 5: Hugging Face
async function testHuggingFace() {
  console.log('🧪 TESTE 5: Conectividade Hugging Face');
  console.log('━'.repeat(50));
  
  try {
    const response = await fetch('https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HF_TOKEN_COZINHA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: 'Hello, I am a chef',
        parameters: { max_new_tokens: 50 }
      })
    });
    
    console.log(`📥 Status: ${response.status} ${response.ok ? '✅' : '❌'}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('🤖 Resposta HF obtida com sucesso');
    } else {
      const error = await response.text();
      console.log('❌ Erro HF:', error);
    }
  } catch (error) {
    console.log('❌ Erro ao conectar Hugging Face:', error.message);
  }
  
  console.log('');
}

// Executar todos os testes
async function runAllTests() {
  const startTime = Date.now();
  
  await testTheMealDB();
  await testHuggingFace();
  
  // Comentar os testes de API locais por enquanto (precisam do servidor rodando)
  console.log('⚠️  TESTES DE API LOCAL (necessário servidor rodando):');
  console.log('   Para testar, execute: npm run dev');
  console.log('   Depois descomente os testes abaixo no código\n');
  
  // await testSuggestions();
  // await testChat();  
  // await testSearch();
  
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  console.log('🏁 TESTES CONCLUÍDOS');
  console.log(`⏱️  Tempo total: ${duration}s`);
  console.log('');
  console.log('📋 PRÓXIMOS PASSOS:');
  console.log('1. Execute "npm run dev" no backend');
  console.log('2. Teste as APIs manualmente ou com Postman');
  console.log('3. Integre com o frontend');
}

// Executar
runAllTests().catch(console.error);