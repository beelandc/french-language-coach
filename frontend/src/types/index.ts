// API Type Definitions for French Language Coach

// Scenario types
export interface Scenario {
  id: string
  name: string
  description: string
}

// Message types - matches backend schemas
// Backend Message only has role and content, but we add client-side metadata
export type MessageRole = 'user' | 'assistant'

export interface Message {
  id: string
  session_id: string
  role: MessageRole
  content: string
  created_at: string
}

// Backend message format (what comes from API)
export interface BackendMessage {
  role: string
  content: string
}

// Session types - id is integer from backend, but we treat as string for consistency
export interface Session {
  id: string
  scenario_id: string
  created_at: string
  ended_at: string | null
  messages: Message[]
  feedback: Feedback | null
}

// Correction type for feedback
export interface Correction {
  original: string
  corrected: string
  explanation: string
}

// Feedback types
export interface Feedback {
  grammar_score: number
  vocabulary_score: number
  fluency_score: number
  overall_score: number
  strengths: string[]
  focus_area: string
  example_corrections: Correction[]
}

// API Response types
export interface CreateSessionResponse {
  id: string
  scenario_id: string
  created_at: string
}

export interface SendMessageResponse {
  role: MessageRole
  content: string
  session_id: string
}

export interface ApiError {
  detail: string
}

// Component prop types
export interface ScenarioCardProps {
  scenario: Scenario
  onClick: () => void
}

export interface MessageProps {
  message: Message
}

export interface ChatInterfaceProps {
  sessionId: string
}

export interface FeedbackViewProps {
  sessionId: string
}
