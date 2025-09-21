/**
 * Tipos compartilhados do CatButler Backend
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

// Tipos base do sistema
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    message: string
    code?: string
    details?: any
  }
  pagination?: {
    page: number
    pageSize: number
    total: number
    hasNext: boolean
  }
}

// Extensão do VercelRequest com user info
export interface AuthenticatedRequest extends VercelRequest {
  user: {
    id: string
    email?: string
  }
}

// Handler type para funções autenticadas
export type AuthHandler<T = any> = (
  req: AuthenticatedRequest,
  res: VercelResponse
) => Promise<void>

// Handler type para funções públicas
export type PublicHandler<T = any> = (
  req: VercelRequest,
  res: VercelResponse
) => Promise<void>

// Modelos do banco de dados
export interface UserProfile {
  id: string
  display_name?: string
  first_name?: string
  last_name?: string
  avatar?: 'axel' | 'frajonilda' | 'misscat' | 'oliver'
  theme?: 'light' | 'dark' | 'auto'
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  user_id: string
  title: string
  description?: string
  category?: string
  priority: 'baixa' | 'media' | 'alta'
  status: 'pendente' | 'em_andamento' | 'concluida'
  due_date?: string
  created_at: string
  updated_at: string
}

export interface Event {
  id: string
  user_id: string
  title: string
  starts_at: string
  ends_at?: string
  category?: string
  completed: boolean
  created_at: string
  updated_at: string
}

export interface Activity {
  id: string
  actor_id: string
  verb: 'created' | 'updated' | 'deleted' | 'completed'
  object_type: 'task' | 'event' | 'profile' | 'recipe' | 'list'
  object_id: string
  metadata?: Record<string, any>
  created_at: string
}

// Query params comuns
export interface PaginationQuery {
  page?: number
  pageSize?: number
}

export interface DateRangeQuery {
  fromDate?: string
  toDate?: string
}

// Enums
export const TASK_PRIORITIES = ['baixa', 'media', 'alta'] as const
export const TASK_STATUSES = ['pendente', 'em_andamento', 'concluida'] as const
export const ACTIVITY_VERBS = ['created', 'updated', 'deleted', 'completed'] as const
export const OBJECT_TYPES = ['task', 'event', 'profile', 'recipe', 'list'] as const