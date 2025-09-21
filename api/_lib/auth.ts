/**
 * Middleware de autenticação para o CatButler Backend
 * Valida o token Bearer e extrai informações do usuário
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { AuthenticatedRequest, AuthHandler, PublicHandler } from './types'
import { createUserSupabaseClient } from './supabase'
import { sendError } from './response'

/**
 * Middleware que verifica autenticação
 * Adiciona informações do usuário ao request
 */
export async function authenticateUser(req: VercelRequest): Promise<{
  user: { id: string; email?: string } | null
  error: string | null
}> {
  const authHeader = req.headers.authorization
  
  if (!authHeader?.startsWith('Bearer ')) {
    return { user: null, error: 'Missing or invalid authorization header' }
  }
  
  const token = authHeader.slice(7) // Remove 'Bearer '
  
  // Validação básica do token JWT
  if (!token || token.length < 10 || !token.includes('.')) {
    return { user: null, error: 'Invalid token format' }
  }
  
  try {
    // Cria cliente Supabase com o token do usuário
    const supabaseUser = createUserSupabaseClient(token)
    
    // Verifica se o token é válido - CORREÇÃO: não passar o token novamente
    const { data: { user }, error } = await supabaseUser.auth.getUser()
    
    if (error) {
      console.log(`[Auth] Supabase auth error: ${error.message}`)
      return { user: null, error: 'Invalid or expired token' }
    }
    
    if (!user) {
      return { user: null, error: 'User not found' }
    }
    
    // Log seguro (sem dados sensíveis)
    console.log(`[Auth] User authenticated: ${user.id.slice(0, 8)}...`)
    
    return {
      user: {
        id: user.id,
        ...(user.email && { email: user.email }),
      },
      error: null,
    }
  } catch (error) {
    console.error('[Auth] Error validating token:', error instanceof Error ? error.message : 'Unknown error')
    return { user: null, error: 'Authentication failed' }
  }
}

/**
 * Wrapper para handlers que precisam de autenticação
 * Automaticamente valida o token e injeta user info no request
 */
export function withAuth(handler: AuthHandler): PublicHandler {
  return async (req: VercelRequest, res: VercelResponse) => {
    const { user, error } = await authenticateUser(req)
    
    if (error || !user) {
      return sendError(res, 401, error || 'Authentication required')
    }
    
    // Adiciona user info ao request
    const authenticatedReq = req as AuthenticatedRequest
    authenticatedReq.user = user
    
    // Log da requisição autenticada (sem dados sensíveis)
    console.log(`[Auth] User ${user.id.slice(0, 8)}... accessing ${req.method} ${req.url}`)
    
    return handler(authenticatedReq, res)
  }
}

/**
 * Verifica se o request possui token válido (opcional)
 * Usado em endpoints que podem funcionar com ou sem autenticação
 */
export async function optionalAuth(req: VercelRequest): Promise<{
  user: { id: string; email?: string } | null
}> {
  const { user } = await authenticateUser(req)
  return { user }
}