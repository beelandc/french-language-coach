// API Client for French Language Coach
import type { Feedback } from '../types/index'

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

  return response.json() as Promise<T>
}

// Session API functions
export const sessionApi = {
  create: (scenarioId: string) => 
    api<{ id: string; scenario_id: string; created_at: string }>('/sessions/', {
      method: 'POST',
      data: { scenario_id: scenarioId },
    }),

  sendMessage: (sessionId: string, content: string) =>
    api<{ role: string; content: string; session_id: string }>(
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
}

// Re-export types for convenience
export type {
  Scenario,
  Message,
  MessageRole,
  Session,
  Correction,
  ApiError,
} from '../types/index'
