/**
 * Profile API - PUT/PATCH /api/profile/update
 * Atualiza o perfil do usuário autenticado
 */

import type { VercelResponse } from '@vercel/node'
import { 
  withAuth, 
  withCors, 
  rateLimit,
  sendSuccess, 
  sendError,
  sendValidationError,
  sendInternalError,
  sendNotFound,
  createUserSupabaseClient,
  validateBody,
  updateProfileSchema,
  type AuthenticatedRequest,
} from '../_lib/index'

async function updateProfile(req: AuthenticatedRequest, res: VercelResponse) {
  if (!['PUT', 'PATCH'].includes(req.method || '')) {
    return sendError(res, 405, 'Method not allowed')
  }
  
  const userId = req.user.id
  const authHeader = req.headers.authorization!
  const token = authHeader.slice(7)
  
  // Valida o body da requisição
  const { data: updateData, error: validationError } = validateBody(
    updateProfileSchema,
    req.body
  )
  
  if (validationError || !updateData) {
    return sendValidationError(
      res,
      'Invalid profile data',
      validationError?.issues
    )
  }
  
  try {
    // Cria cliente Supabase com token do usuário
    const supabase = createUserSupabaseClient(token)
    
    // Verifica se perfil existe
    const { error: fetchError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .single()
    
    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return sendNotFound(res, 'Profile')
      }
      console.error('[Profile] Error fetching profile:', fetchError)
      return sendInternalError(res, 'Failed to fetch profile')
    }
    
    // Atualiza o perfil
    const { data: updatedProfile, error: updateError } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single()
    
    if (updateError) {
      console.error('[Profile] Error updating profile:', updateError)
      return sendInternalError(res, 'Failed to update profile')
    }
    
    // Log da atividade
    await supabase
      .from('activities')
      .insert({
        actor_id: userId,
        verb: 'updated',
        object_type: 'profile',
        object_id: userId,
        metadata: {
          changes: Object.keys(updateData || {}),
          timestamp: new Date().toISOString(),
        },
      })
      .select()
    
    console.log(`[Profile] Profile updated for user ${userId}:`, {
      keys: Object.keys(updateData || {}),
      data: updateData,
      result: updatedProfile
    })
    return sendSuccess(res, updatedProfile)
    
  } catch (error) {
    console.error('[Profile] Unexpected error:', error)
    return sendInternalError(res, 'Profile update failed')
  }
}

// Aplica middlewares: CORS → Rate Limit → Auth
export default withCors(
  rateLimit({ 
    windowMs: 60 * 1000, 
    maxRequests: 10 
  })(
    withAuth(updateProfile)
  )
)