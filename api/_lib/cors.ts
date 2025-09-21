/**
 * Middleware de CORS para o CatButler Backend
 * Configura cabeçalhos de Cross-Origin Resource Sharing
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

function getAllowedOrigins(): string[] {
  // Sempre inclui o domínio de produção e localhost
  const origins = [
    process.env.FRONTEND_URL,
    process.env.ALLOWED_ORIGIN,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    'https://catbutler-frontend.vercel.app',
    'http://localhost:5173',
  ].filter(Boolean) as string[]
  return Array.from(new Set(origins))
}

function logCorsDecision(origin: string | undefined, allowed: boolean, allowedOrigins: string[]) {
  // Loga no Vercel (console.log vai para os logs do serverless)
  console.log('[CORS] Origin:', origin, '| Allowed:', allowed, '| Allowed Origins:', allowedOrigins)
}

const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
const ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Requested-With',
  'Accept',
  'Origin',
]

/**
 * Configura cabeçalhos CORS
 */
export function setCorsHeaders(req: VercelRequest, res: VercelResponse): void {
  const origin = req.headers.origin
  const ALLOWED_ORIGINS = getAllowedOrigins()
  const allowed = !!(origin && ALLOWED_ORIGINS.includes(origin))
  logCorsDecision(origin, allowed, ALLOWED_ORIGINS)

  if (allowed && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  } else {
    // Bloqueia requisições de origens não permitidas
    res.setHeader('Access-Control-Allow-Origin', 'null')
    // Loga motivo detalhado
    if (origin) {
      console.warn('[CORS] Origin NÃO PERMITIDA:', origin)
    } else {
      console.warn('[CORS] Origin ausente no header!')
    }
  }

  res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS.join(', '))
  res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS.join(', '))
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Max-Age', '86400') // 24 hours
}

/**
 * Manipula requisições OPTIONS (preflight)
 */
export function handleOptions(req: VercelRequest, res: VercelResponse): boolean {
  if (req.method === 'OPTIONS') {
    setCorsHeaders(req, res)
    res.status(200).end()
    return true
  }
  return false
}

/**
 * Middleware que aplica CORS automaticamente
 */
export function withCors(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void> | void
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    // Aplica cabeçalhos CORS
    setCorsHeaders(req, res)
    
    // Manipula preflight
    if (handleOptions(req, res)) {
      return
    }
    
    // Executa handler
    return handler(req, res)
  }
}