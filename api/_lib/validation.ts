/**
 * Esquemas de validação Zod para o CatButler Backend
 * Define a estrutura esperada dos payloads
 */

import { z } from 'zod'
import { 
  TASK_PRIORITIES, 
  TASK_STATUSES, 
  ACTIVITY_VERBS, 
  OBJECT_TYPES 
} from './types'

// Validadores base
export const uuidSchema = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  'Invalid UUID format'
)
export const dateSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
  'Invalid datetime format'
).optional()
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

// Esquemas para User Profile
export const createProfileSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  first_name: z.string().min(1).max(50).optional(),
  last_name: z.string().min(1).max(50).optional(),
  avatar: z.enum(['axel', 'frajonilda', 'misscat', 'oliver']).default('axel'),
  theme: z.enum(['light', 'dark', 'auto']).default('auto'),
})

export const updateProfileSchema = createProfileSchema.partial()

// Esquemas para Tasks
export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  category: z.string().max(50).optional(),
  priority: z.enum(TASK_PRIORITIES),
  status: z.enum(TASK_STATUSES).default('pendente'),
  due_date: dateSchema,
})

export const updateTaskSchema = createTaskSchema.partial()

export const taskQuerySchema = z.object({
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  category: z.string().optional(),
  ...paginationSchema.shape,
})

// Esquemas para Events
export const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  starts_at: z.string().regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
    'Invalid datetime format'
  ),
  ends_at: dateSchema,
  category: z.string().max(50).optional(),
  completed: z.boolean().default(false),
})

export const updateEventSchema = createEventSchema.partial()

export const eventQuerySchema = z.object({
  fromDate: z.string().regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
    'Invalid datetime format'
  ).optional(),
  toDate: z.string().regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
    'Invalid datetime format'
  ).optional(),
  category: z.string().optional(),
  completed: z.boolean().optional(),
  ...paginationSchema.shape,
})

// Esquemas para Activities
export const activityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  before: z.string().regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
    'Invalid datetime format'
  ).optional(),
  objectType: z.enum(OBJECT_TYPES).optional(),
})

export const createActivitySchema = z.object({
  verb: z.enum(ACTIVITY_VERBS),
  object_type: z.enum(OBJECT_TYPES),
  object_id: uuidSchema,
  metadata: z.record(z.string(), z.any()).optional(),
})

// Esquemas para Uploads
export const uploadSignSchema = z.object({
  filePath: z.string().min(1).max(200),
  mimeType: z.string().min(1),
  fileSize: z.number().int().positive().max(10 * 1024 * 1024), // 10MB
})

// Esquemas para Stats
export const statsQuerySchema = z.object({
  period: z.enum(['week', 'month', 'year']).default('week'),
})

// Helper para validar query params
export function validateQueryParams<T>(schema: z.ZodSchema<T>, query: any): {
  data: T | null
  error: z.ZodError | null
} {
  const result = schema.safeParse(query)
  
  if (result.success) {
    return { data: result.data, error: null }
  }
  
  return { data: null, error: result.error }
}

// Helper para validar body
export function validateBody<T>(schema: z.ZodSchema<T>, body: any): {
  data: T | null
  error: z.ZodError | null
} {
  const result = schema.safeParse(body)
  
  if (result.success) {
    return { data: result.data, error: null }
  }
  
  return { data: null, error: result.error }
}