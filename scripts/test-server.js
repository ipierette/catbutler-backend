#!/usr/bin/env node
/**
 * Servidor de teste ultra-simples para testar conectividade
 */

import { createServer } from 'http'

const PORT = process.env.PORT || 3000

// Handler mínimo para testar
function handler(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }
  
  // Chat endpoint
  if (url.pathname === '/api/kitchen/chat') {
    res.setHeader('Content-Type', 'application/json')
    res.writeHead(200)
    res.end(JSON.stringify({
      success: true,
      data: {
        resposta: "Olá! Sou o Chef IA. Como posso te ajudar hoje? Vou simular uma resposta para testar a conectividade. Em produção, eu usaria IA real para responder suas perguntas culinárias! 👨‍🍳",
        sugestoes: ["Que tal um risotto?", "Precisa de ajuda com temperos?"],
        tokensUsados: 10,
        limiteDiario: 100
      }
    }))
    return
  }
  
  // Suggestions endpoint
  if (url.pathname === '/api/kitchen/suggestions') {
    res.setHeader('Content-Type', 'application/json')
    res.writeHead(200)
    res.end(JSON.stringify({
      success: true,
      data: {
        receitas: [
          {
            id: 'mock-1',
            nome: 'Receita Teste com seus ingredientes',
            descricao: 'Uma receita simulada para testar a conectividade',
            ingredientes: ['Seus ingredientes', 'simulados'],
            instrucoes: 'Instruções de teste',
            tempoEstimado: '30 min',
            dificuldade: 'Fácil',
            fonte: 'local'
          }
        ],
        total: 1,
        fontes: { local: 1, mealdb: 0, ia: 0 },
        tempoResposta: 100,
        ingredientesPesquisados: []
      }
    }))
    return
  }
  
  // Favorites endpoint
  if (url.pathname === '/api/kitchen/favorites') {
    res.setHeader('Content-Type', 'application/json')
    res.writeHead(200)
    res.end(JSON.stringify({
      success: true,
      data: {
        favoritos: []
      }
    }))
    return
  }
  
  // Outros endpoints kitchen
  if (url.pathname.includes('/api/kitchen/')) {
    res.setHeader('Content-Type', 'application/json')
    res.writeHead(200)
    res.end(JSON.stringify({
      success: true,
      message: `Kitchen API endpoint: ${url.pathname} funcionando!`,
      method: req.method,
      timestamp: new Date().toISOString()
    }))
    return
  }
  
  // Health check
  if (url.pathname === '/api/health') {
    res.setHeader('Content-Type', 'application/json')
    res.writeHead(200)
    res.end(JSON.stringify({
      success: true,
      message: 'Backend está funcionando!',
      timestamp: new Date().toISOString(),
      endpoints: [
        '/api/health',
        '/api/kitchen/favorites',
        '/api/kitchen/suggestions',
        '/api/kitchen/search',
        '/api/kitchen/chat'
      ]
    }))
    return
  }
  
  // 404 para outras rotas
  res.setHeader('Content-Type', 'application/json')
  res.writeHead(404)
  res.end(JSON.stringify({
    success: false,
    error: 'Endpoint não encontrado',
    path: url.pathname
  }))
}

// Cria servidor
const server = createServer(handler)

server.listen(PORT, () => {
  console.log(`
🐱 CatButler Backend - Servidor de TESTE
🚀 Servidor rodando em http://localhost:${PORT}

📋 Testando conectividade para:
  GET  http://localhost:${PORT}/api/health
  GET  http://localhost:${PORT}/api/kitchen/favorites
  POST http://localhost:${PORT}/api/kitchen/suggestions

💡 Para testar:
  curl http://localhost:${PORT}/api/health

🎯 Este servidor é apenas para testar se o frontend consegue conectar!
`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Parando servidor...')
  server.close(() => {
    console.log('✅ Servidor parado')
    process.exit(0)
  })
})