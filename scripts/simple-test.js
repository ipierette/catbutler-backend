/**
 * Teste simples e direto do health check
 * Testa sem depender de compilação ou imports complexos
 */

import { createServer } from 'http'

const server = createServer((req, res) => {
  // CORS básico
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  // Handle OPTIONS
  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }
  
  // Only health check for now
  if (req.url === '/api/health') {
    const healthData = {
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        services: {
          database: 'not_tested', // Não vamos testar DB agora
          environment: 'configured'
        },
        uptime: process.uptime() * 1000
      }
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(healthData, null, 2))
    return
  }
  
  // 404 para outras rotas
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({
    success: false,
    error: {
      message: 'Endpoint not found',
      code: 'NOT_FOUND'
    }
  }))
})

const PORT = 3001 // Porta diferente para evitar conflitos

server.listen(PORT, () => {
  console.log(`
🐱 CatButler Backend - Teste Simples
🚀 Health check disponível em: http://localhost:${PORT}/api/health

💡 Teste com:
  curl http://localhost:${PORT}/api/health
`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close()
  process.exit(0)
})