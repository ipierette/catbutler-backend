/**
 * Profile API - GET /api/profile
 * Busca o perfil do usuário autenticado
 * Auto-cria perfil se não existir
 */

import type { VercelResponse } from '@vercel/node'
import { 
  withAuth, 
  withCors, 
  rateLimit,
  sendSuccess, 
  sendError,
  sendInternalError,
  createUserSupabaseClient,
  type AuthenticatedRequest,
  type UserProfile
} from '../_lib/index'

async function getProfile(req: AuthenticatedRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return sendError(res, 405, 'Method not allowed')
  }
  
  const userId = req.user.id
  const authHeader = req.headers.authorization!
  const token = authHeader.slice(7)
  
  try {
    // Cria cliente Supabase com token do usuário
    const supabase = createUserSupabaseClient(token)
    
    // Busca perfil existente
    const { data: profile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = "not found", outros erros são problemáticos
      console.error('[Profile] Error fetching profile:', fetchError)
      return sendInternalError(res, 'Failed to fetch profile')
    }
    
    // Se perfil existe, retorna
    if (profile) {
      console.log(`[Profile] Profile found for user ${userId}`)
      return sendSuccess(res, profile)
    }
    
    // Auto-cria perfil se não existir
    console.log(`[Profile] Creating profile for user ${userId}`)
    
    const newProfile: Omit<UserProfile, 'created_at' | 'updated_at'> = {
      id: userId,
      display_name: req.user.email?.split('@')[0] || 'Usuário',
      theme: 'auto',
    }
    
    const { data: createdProfile, error: insertError } = await supabase
      .from('user_profiles')
      .insert(newProfile)
      .select()
      .single()
    
    if (insertError) {
      console.error('[Profile] Error creating profile:', insertError)
      return sendInternalError(res, 'Failed to create profile')
    }
    
    console.log(`[Profile] Profile created for user ${userId}`)
    return sendSuccess(res, createdProfile, 201)
    
  } catch (error) {
    console.error('[Profile] Unexpected error:', error)
    return sendInternalError(res, 'Profile operation failed')
  }
}

// Aplica middlewares: CORS → Rate Limit → Auth
export default withCors(
  rateLimit({ 
    windowMs: 60 * 1000, 
    maxRequests: 30 
  })(
    withAuth(getProfile)
  )
)