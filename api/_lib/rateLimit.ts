/**
 * Sistema de Rate Limiting simples para Vercel Functions
 * Implementa throttling básico por IP e endpoint
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sendError } from './response'

interface RateLimitEntry {
  count: number
  resetTime: number
}

// Cache em memória (funciona no Vercel para requests na mesma instância)
const rateLimitCache = new Map<string, RateLimitEntry>()

// Configurações padrão
const DEFAULT_WINDOW_MS = 60 * 1000 // 1 minuto
const DEFAULT_MAX_REQUESTS = 60 // 60 requests por minuto

// Configurações específicas por endpoint
const ENDPOINT_LIMITS: Record<string, { windowMs: number; maxRequests: number }> = {
  '/api/auth/': { windowMs: 5 * 60 * 1000, maxRequests: 10 }, // 10 por 5 min
  '/api/uploads/': { windowMs: 60 * 1000, maxRequests: 5 }, // 5 por minuto
  '/api/activities': { windowMs: 60 * 1000, maxRequests: 100 }, // 100 por minuto (feed)
}

/**
 * Obtém IP do cliente
 */
function getClientIP(req: VercelRequest): string {
  return (
    req.headers['x-forwarded-for'] as string ||
    req.headers['x-real-ip'] as string ||
    req.socket?.remoteAddress ||
    'unknown'
  ).split(',')[0]?.trim() || 'unknown'
}

/**
 * Limpa entradas expiradas do cache
 */
function cleanupCache(): void {
  const now = Date.now()
  for (const [key, entry] of rateLimitCache.entries()) {
    if (now > entry.resetTime) {
      rateLimitCache.delete(key)
    }
  }
}

/**
 * Verifica e atualiza rate limit para um cliente
 */
function checkRateLimit(
  clientId: string,
  maxRequests: number,
  windowMs: number
): {
  allowed: boolean
  remaining: number
  resetTime: number
} {
  const now = Date.now()
  const key = clientId
  
  // Limpa cache periodicamente
  if (Math.random() < 0.01) { // 1% chance
    cleanupCache()
  }
  
  const entry = rateLimitCache.get(key)
  
  if (!entry || now > entry.resetTime) {
    // Nova janela ou primeira requisição
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + windowMs,
    }
    rateLimitCache.set(key, newEntry)
    
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: newEntry.resetTime,
    }
  }
  
  // Janela ativa - incrementa contador
  entry.count += 1
  
  if (entry.count > maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    }
  }
  
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetTime: entry.resetTime,
  }
}

/**
 * Middleware de rate limiting
 */
export function rateLimit(options?: {
  windowMs?: number
  maxRequests?: number
  keyGenerator?: (req: VercelRequest) => string
}) {
  const windowMs = options?.windowMs || DEFAULT_WINDOW_MS
  const maxRequests = options?.maxRequests || DEFAULT_MAX_REQUESTS
  const keyGenerator = options?.keyGenerator || ((req) => getClientIP(req))
  
  return (
    handler: (req: VercelRequest, res: VercelResponse) => Promise<void> | void
  ) => {
    return async (req: VercelRequest, res: VercelResponse) => {
      const clientId = keyGenerator(req)
      const endpoint = req.url || ''
      
      // Verifica se há limite específico para o endpoint
      let finalWindowMs = windowMs
      let finalMaxRequests = maxRequests
      
      for (const [pattern, config] of Object.entries(ENDPOINT_LIMITS)) {
        if (endpoint.includes(pattern)) {
          finalWindowMs = config.windowMs
          finalMaxRequests = config.maxRequests
          break
        }
      }
      
      const { allowed, remaining, resetTime } = checkRateLimit(
        `${clientId}:${endpoint}`,
        finalMaxRequests,
        finalWindowMs
      )
      
      // Adiciona headers informativos
      res.setHeader('X-RateLimit-Limit', finalMaxRequests.toString())
      res.setHeader('X-RateLimit-Remaining', remaining.toString())
      res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString())
      
      if (!allowed) {
        const retryAfter = Math.ceil((resetTime - Date.now()) / 1000)
        res.setHeader('Retry-After', retryAfter.toString())
        
        return sendError(
          res,
          429,
          'Too many requests. Please try again later.',
          'RATE_LIMIT_EXCEEDED',
          { retryAfter }
        )
      }
      
      return handler(req, res)
    }
  }
}