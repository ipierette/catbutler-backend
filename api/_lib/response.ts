/**
 * Utilitários para respostas HTTP no CatButler Backend
 * Padroniza formato de respostas de sucesso e erro
 */

import type { VercelResponse } from '@vercel/node'
import type { ApiResponse } from './types'

/**
 * Envia resposta de sucesso padronizada
 */
export function sendSuccess<T>(
  res: VercelResponse,
  data: T,
  status: number = 200,
  pagination?: ApiResponse['pagination']
): void {
  const response: ApiResponse<T> = {
    success: true,
    data,
    ...(pagination && { pagination }),
  }
  
  res.status(status).json(response)
}

/**
 * Envia resposta de erro padronizada
 */
export function sendError(
  res: VercelResponse,
  status: number,
  message: string,
  code?: string,
  details?: any
): void {
  const response: ApiResponse = {
    success: false,
    error: {
      message,
      ...(code && { code }),
      ...(details && { details }),
    },
  }
  
  // Log do erro para debugging
  console.error(`[Error ${status}] ${message}`, {
    code,
    details,
    timestamp: new Date().toISOString(),
  })
  
  res.status(status).json(response)
}

/**
 * Envia resposta de validação de erro (400)
 */
export function sendValidationError(
  res: VercelResponse,
  message: string,
  details?: any
): void {
  sendError(res, 400, message, 'VALIDATION_ERROR', details)
}

/**
 * Envia resposta de não encontrado (404)
 */
export function sendNotFound(
  res: VercelResponse,
  resource: string = 'Resource'
): void {
  sendError(res, 404, `${resource} not found`, 'NOT_FOUND')
}

/**
 * Envia resposta de não autorizado (401)
 */
export function sendUnauthorized(
  res: VercelResponse,
  message: string = 'Authentication required'
): void {
  sendError(res, 401, message, 'UNAUTHORIZED')
}

/**
 * Envia resposta de proibido (403)
 */
export function sendForbidden(
  res: VercelResponse,
  message: string = 'Access denied'
): void {
  sendError(res, 403, message, 'FORBIDDEN')
}

/**
 * Envia resposta de erro interno (500)
 */
export function sendInternalError(
  res: VercelResponse,
  message: string = 'Internal server error'
): void {
  sendError(res, 500, message, 'INTERNAL_ERROR')
}