/**
 * Utilitários gerais do CatButler Backend
 */

import type { VercelRequest } from '@vercel/node'

/**
 * Gera um ID único para requests (para logging)
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Calcula paginação
 */
export function calculatePagination(
  total: number,
  page: number,
  pageSize: number
) {
  const totalPages = Math.ceil(total / pageSize)
  const hasNext = page < totalPages
  const hasPrevious = page > 1
  const offset = (page - 1) * pageSize
  
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNext,
    hasPrevious,
    offset,
  }
}

/**
 * Parseia query parameters de forma segura
 */
export function parseQueryParam(
  req: VercelRequest,
  key: string,
  defaultValue?: string
): string | undefined {
  const value = req.query[key]
  
  if (Array.isArray(value)) {
    return value[0] || defaultValue
  }
  
  return value || defaultValue
}

/**
 * Parseia query parameter numérico
 */
export function parseNumericQueryParam(
  req: VercelRequest,
  key: string,
  defaultValue?: number
): number | undefined {
  const value = parseQueryParam(req, key)
  
  if (value === undefined) {
    return defaultValue
  }
  
  const numeric = parseInt(value, 10)
  return isNaN(numeric) ? defaultValue : numeric
}

/**
 * Parseia query parameter booleano
 */
export function parseBooleanQueryParam(
  req: VercelRequest,
  key: string,
  defaultValue?: boolean
): boolean | undefined {
  const value = parseQueryParam(req, key)
  
  if (value === undefined) {
    return defaultValue
  }
  
  return value.toLowerCase() === 'true'
}

/**
 * Normaliza string para busca (remove acentos, converte para lowercase)
 */
export function normalizeSearchString(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Valida se uma string é um UUID válido
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * Formata data para ISO string
 */
export function formatDateToISO(date: Date): string {
  return date.toISOString()
}

/**
 * Verifica se uma data está no futuro
 */
export function isFutureDate(dateString: string): boolean {
  const date = new Date(dateString)
  return date.getTime() > Date.now()
}

/**
 * Limita o tamanho de um objeto para logging seguro
 */
export function safePrint(obj: any, maxDepth: number = 3): any {
  const seen = new WeakSet()
  
  const replacer = (key: string, value: any): any => {
    if (value === null) return null
    if (typeof value !== 'object') return value
    if (seen.has(value)) return '[Circular]'
    
    seen.add(value)
    
    if (maxDepth <= 0) return '[Object]'
    
    if (Array.isArray(value)) {
      return value.slice(0, 10).map(item => 
        replacer(key, item)
      )
    }
    
    const result: any = {}
    let count = 0
    for (const [k, v] of Object.entries(value)) {
      if (count >= 20) {
        result['...'] = `${Object.keys(value).length - count} more keys`
        break
      }
      result[k] = replacer(k, v)
      count++
    }
    
    return result
  }
  
  return JSON.parse(JSON.stringify(obj, replacer))
}