// API Client for French Language Coach
import type { Feedback } from '../types/index'

const API_BASE = import.meta.env.PROD ? window.location.origin : 'http://localhost:8000'

interface ApiOptions extends RequestInit {
  data?: unknown
}

/**
 * Generic API client for making requests to the FastAPI backend
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

  const response = await fetch(`${API_BASE}${endpoint}`, config)
  
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
