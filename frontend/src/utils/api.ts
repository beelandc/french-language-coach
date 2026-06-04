// API Client for French Language Coach
import type { Feedback, Session, SessionLockResponse } from '../types/index'

// Use relative paths for development (Vite proxy handles routing)
// Use same-origin for production
const API_BASE = '' // Empty string = relative to current origin

interface ApiOptions extends RequestInit {
  data?: unknown
}

/**
 * Generic API client for making requests to the FastAPI backend
 * 
 * In development: Vite proxy forwards /sessions/* to http://localhost:8000
 * In production: Same-origin requests go directly to FastAPI
 */
export async function api<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { data, ...rest } = options
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...rest.headers,
    },
    ...rest,
  }

  if (data) {
    config.body = JSON.stringify(data)
  }

  // Use relative URL - Vite proxy will handle it in dev, same-origin in prod
  const url = `${API_BASE}${endpoint}`
  const response = await fetch(url, config)
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const errorMessage = errorData.detail || `HTTP error! status: ${response.status}`
    throw new Error(errorMessage)
  }

  // Handle 204 No Content responses (e.g., DELETE requests)
  if (response.status === 204) {
    return undefined as unknown as T
  }

  return response.json() as Promise<T>
}

// Session API functions
// Note: Backend returns session_id as integer, but we coerce to string for frontend consistency
export const sessionApi = {
  create: (scenarioId: string, difficulty?: string) => 
    api<{ id: number; scenario_id: string; difficulty: string; created_at: string }>('/sessions/', {
      method: 'POST',
      data: { scenario_id: scenarioId, ...(difficulty && { difficulty }) },
    }),

  sendMessage: (sessionId: string, content: string) =>
    api<{ role: string; content: string; session_id: number }>(
      `/sessions/${sessionId}/messages/`,
      {
        method: 'POST',
        data: { content },
      }
    ),

  getFeedback: (sessionId: string) =>
    api<Feedback>(`/sessions/${sessionId}/feedback/`,
      { method: 'POST' }
    ),

  getSession: (sessionId: string) =>
    api<Session>(`/sessions/${sessionId}`,
      { method: 'GET' }
    ),

  listSessions: (page: number = 1, perPage: number = 10) =>
    api<SessionListResponse>(`/sessions/?page=${page}&per_page=${perPage}`,
      { method: 'GET' }
    ),

  deleteSession: (sessionId: string) =>
    api<void>(`/sessions/${sessionId}`,
      { method: 'DELETE' }
    ),

  lockSession: (sessionId: string, clientId?: string) =>
    api<SessionLockResponse>(`/sessions/${sessionId}/lock`, {
      method: 'POST',
      headers: clientId ? { 'X-Client-ID': clientId } : undefined,
    }),

  unlockSession: (sessionId: string, clientId?: string) =>
    api<SessionLockResponse>(`/sessions/${sessionId}/unlock`, {
      method: 'POST',
      headers: clientId ? { 'X-Client-ID': clientId } : undefined,
    }),
}

// Re-export types for convenience
export type {
  Scenario,
  Message,
  MessageRole,
  Session,
  Correction,
  ApiError,
  SessionSummary,
  PaginationInfo,
  SessionListResponse,
  SessionLockResponse,
  Difficulty,
  DifficultySelectorProps,
} from '../types/index'
