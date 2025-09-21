#!/usr/bin/env node
/**
 * Servidor de desenvolvimento completo para CatButler Backend
 * Inclui todas as rotas incluindo Kitchen APIs
 */

import { createServer } from 'http'
import { readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { parse, fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const PORT = process.env.PORT || 3000

// Simula o ambiente Vercel
process.env.NODE_ENV = process.env.NODE_ENV || 'development'

// Carrega variáveis de ambiente do .env.local
try {
  const envContent = await readFile(join(__dirname, '..', '.env.local'), 'utf8')
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=')
    if (key && value && !key.startsWith('#')) {
      process.env[key.trim()] = value.trim()
    }
  })
  console.log('✅ Variáveis de ambiente carregadas')
} catch (error) {
  console.warn('⚠️ Arquivo .env.local não encontrado - usando variáveis do sistema:', error.message)
}

// Handler básico que simula Vercel Functions
async function handler(req, res) {
  const { pathname } = parse(req.url, true)
  
  // Remove /api prefix se existir
  const apiPath = pathname.replace(/^\/api/, '') || '/'
  
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
  
  try {
    let handler
    
    // Mapeia rotas para arquivos
    switch (true) {
      case apiPath === '/health': {
        const healthModule = await import('../api/health.js')
        handler = healthModule.default
        break
      }
        
      case apiPath === '/profile': {
        const profileModule = await import('../api/profile/index.js')
        handler = profileModule.default
        break
      }
        
      case apiPath === '/profile/update': {
        const updateModule = await import('../api/profile/update.js')
        handler = updateModule.default
        break
      }

      // Kitchen APIs
      case apiPath === '/kitchen/favorites': {
        const favoritesModule = await import('../api/kitchen/favorites.js')
        handler = favoritesModule.default
        break
      }
      
      case apiPath === '/kitchen/suggestions': {
        const suggestionsModule = await import('../api/kitchen/suggestions.js')
        handler = suggestionsModule.default
        break
      }
      
      case apiPath === '/kitchen/search': {
        const searchModule = await import('../api/kitchen/search.js')
        handler = searchModule.default
        break
      }
      
      case apiPath === '/kitchen/chat': {
        const chatModule = await import('../api/kitchen/chat.js')
        handler = chatModule.default
        break
      }
        
      default:
        res.writeHead(404, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          success: false,
          error: {
            message: `Endpoint not found: ${pathname}`,
            code: 'NOT_FOUND',
            availableEndpoints: [
              '/api/health',
              '/api/profile',
              '/api/profile/update',
              '/api/kitchen/favorites',
              '/api/kitchen/suggestions',
              '/api/kitchen/search',
              '/api/kitchen/chat'
            ]
          }
        }))
        return
    }
    
    // Executa o handler
    await handler(req, res)
    
  } catch (error) {
    console.error('Error handling request:', error)
    
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        success: false,
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_ERROR',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
      }))
    }
  }
}

// Cria servidor
const server = createServer(handler)

server.listen(PORT, () => {
  console.log(`
🐱 CatButler Backend - Servidor de Desenvolvimento COMPLETO
🚀 Servidor rodando em http://localhost:${PORT}

📋 Endpoints disponíveis:
  GET  http://localhost:${PORT}/api/health
  GET  http://localhost:${PORT}/api/profile (requer auth)
  PUT  http://localhost:${PORT}/api/profile/update (requer auth)
  
  🍳 Kitchen APIs:
  GET   http://localhost:${PORT}/api/kitchen/favorites
  POST  http://localhost:${PORT}/api/kitchen/suggestions
  GET   http://localhost:${PORT}/api/kitchen/search
  POST  http://localhost:${PORT}/api/kitchen/chat

💡 Para testar:
  curl http://localhost:${PORT}/api/health
  curl http://localhost:${PORT}/api/kitchen/favorites

⚠️ Este é um servidor de desenvolvimento completo.
   Para produção, use Vercel Functions.
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