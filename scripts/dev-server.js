#!/usr/bin/env node
/**
 * Script de teste básico para o CatButler Backend
 * Testa os endpoints sem depender do Vercel CLI
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
        
      default:
        res.writeHead(404, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          success: false,
          error: {
            message: `Endpoint not found: ${pathname}`,
            code: 'NOT_FOUND'
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
🐱 CatButler Backend - Servidor de Desenvolvimento
🚀 Servidor rodando em http://localhost:${PORT}

📋 Endpoints disponíveis:
  GET  http://localhost:${PORT}/api/health
  GET  http://localhost:${PORT}/api/profile (requer auth)
  PUT  http://localhost:${PORT}/api/profile/update (requer auth)

💡 Para testar:
  curl http://localhost:${PORT}/api/health

⚠️ Este é um servidor de desenvolvimento simples.
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