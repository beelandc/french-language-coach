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

export interface MessageBubbleProps {
  message: Message
}

export interface ChatHeaderProps {
  scenarioName: string
  onBack: () => void
  onEndSession: () => void
  disabled: boolean
}

export interface ScoreCardProps {
  label: string
  value: number
}

export interface CorrectionItemProps {
  correction: Correction
}

export interface ChatInterfaceProps {
  sessionId: string
}

export interface FeedbackViewProps {
  sessionId: string
}

export interface SessionDetailProps {
  sessionId: string
}

// Deprecated: Use MessageBubbleProps instead
export interface MessageProps {
  message: Message
}

// Context types (re-exported from hooks for convenience)
export interface SessionsContextType {
  sessions: Session[]
  currentSessionId: string | null
  currentScenarioId: string | null
  sessionEnded: boolean
  isLoading: boolean
  error: string | null
  createSession: (scenarioId: string) => Promise<string>
  sendMessage: (sessionId: string, content: string) => Promise<Message>
  getFeedback: (sessionId: string, forceRefresh?: boolean) => Promise<Feedback | null>
  endSession: () => void
  setCurrentSessionId: (id: string | null) => void
  clearError: () => void
}

// Session History types
export interface SessionSummary {
  id: string
  scenario_id: string
  scenario_name: string
  difficulty: string
  created_at: string
  ended_at: string | null
  overall_score: number | null
}

export interface PaginationInfo {
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface SessionListResponse {
  sessions: SessionSummary[]
  pagination: PaginationInfo
}

// Session History component prop types
export interface SessionHistoryProps {
  onSessionClick: (sessionId: string) => void
}

export interface SessionHistoryItemProps {
  session: SessionSummary
  onClick: (sessionId: string) => void
  onDelete?: (sessionId: string) => void
}

// Confirmation Modal types
export interface ConfirmationModalProps {
  isOpen: boolean
  onCancel: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isLoading?: boolean
}
