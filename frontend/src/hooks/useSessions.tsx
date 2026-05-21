import { useState, useCallback, createContext, useContext } from 'react'
import { sessionApi } from '../utils/api'
import type { Session, Message, Feedback, Difficulty } from '../types'

interface SessionsContextType {
  sessions: Session[]
  currentSessionId: string | null
  currentScenarioId: string | null
  sessionEnded: boolean
  isLoading: boolean
  error: string | null
  createSession: (scenarioId: string, difficulty?: Difficulty) => Promise<string>
  sendMessage: (sessionId: string, content: string) => Promise<Message>
  getFeedback: (sessionId: string, forceRefresh?: boolean) => Promise<Feedback | null>
  endSession: () => void
  setCurrentSessionId: (id: string | null) => void
  clearError: () => void
  lockSession: (sessionId: string, clientId?: string) => Promise<void>
  unlockSession: (sessionId: string, clientId?: string) => Promise<void>
}

const SessionsContext = createContext<SessionsContextType | undefined>(undefined)

export { SessionsContext }

interface SessionsProviderProps {
  children: React.ReactNode
}

export function SessionsProvider({ children }: SessionsProviderProps) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [currentScenarioId, setCurrentScenarioId] = useState<string | null>(null)
  const [sessionEnded, setSessionEnded] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => setError(null), [])

  const createSession = useCallback(async (scenarioId: string, difficulty?: Difficulty): Promise<string> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await sessionApi.create(scenarioId, difficulty)
      const newSessionId = String(response.id) // Ensure string type
      setCurrentSessionId(newSessionId)
      setCurrentScenarioId(scenarioId)
      setSessionEnded(false)

      // Use messages from the API response (which may include initial AI greeting)
      const messagesFromApi = response.messages || []

      setSessions(prev => [
        ...prev,
        {
          id: newSessionId,
          scenario_id: scenarioId,
          difficulty: difficulty || 'intermediate',
          created_at: response.created_at,
          ended_at: null,
          messages: messagesFromApi,
          feedback: null,
        },
      ])

      setIsLoading(false)
      return newSessionId
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create session'
      setError(errorMessage)
      setIsLoading(false)
      throw err
    }
  }, [])

  const sendMessage = useCallback(async (sessionId: string, content: string): Promise<Message> => {
    if (sessionEnded) throw new Error('This session has ended. Please start a new session.')

    setIsLoading(true)
    setError(null)

    try {
      const response = await sessionApi.sendMessage(sessionId, content)
      const now = new Date().toISOString()
      const timestamp = Date.now()

      setSessions(prev =>
        prev.map(session => {
          if (session.id === sessionId) {
            return {
              ...session,
              messages: [
                ...session.messages,
                {
                  id: String(timestamp),
                  session_id: sessionId,
                  role: 'user' as const,
                  content,
                  created_at: now,
                },
                {
                  id: String(timestamp + 1),
                  session_id: sessionId,
                  role: response.role as 'user' | 'assistant',
                  content: response.content,
                  created_at: now,
                },
              ],
            }
          }
          return session
        })
      )

      const message: Message = {
        id: String(timestamp + 1),
        session_id: sessionId,
        role: response.role as 'user' | 'assistant',
        content: response.content,
        created_at: now,
      }

      setIsLoading(false)
      return message
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
      setError(errorMessage)
      setIsLoading(false)
      throw err
    }
  }, [sessionEnded])

  const getFeedback = useCallback(async (sessionId: string, forceRefresh: boolean = false): Promise<Feedback | null> => {
    setIsLoading(true)
    setError(null)

    try {
      // Check if we already have feedback for this session
      const existingSession = sessions.find(s => s.id === sessionId)
      if (existingSession?.feedback && !forceRefresh) {
        // Return cached feedback without making API call
        setIsLoading(false)
        return existingSession.feedback
      }

      const feedback = await sessionApi.getFeedback(sessionId)

      setSessions(prev =>
        prev.map(session => {
          if (session.id === sessionId) {
            return {
              ...session,
              feedback,
              ended_at: new Date().toISOString(),
            }
          }
          return session
        })
      )

      setSessionEnded(true)
      setIsLoading(false)
      return feedback
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get feedback'
      setError(errorMessage)
      setIsLoading(false)
      throw err
    }
  }, [sessions])

  const endSession = useCallback(() => setSessionEnded(true), [])

  const lockSession = useCallback(async (sessionId: string, clientId?: string): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      // Update session state optimistically first
      setSessions(prev =>
        prev.map(session => {
          if (session.id === sessionId) {
            return {
              ...session,
              is_locked: true,
              locked_at: new Date().toISOString(),
              locked_by: clientId || `client_${sessionId}_${Date.now()}`,
            }
          }
          return session
        })
      )

      // Call API to lock on backend
      await sessionApi.lockSession(sessionId, clientId)
      setIsLoading(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to lock session'
      setError(errorMessage)
      setIsLoading(false)
      // Revert optimistic update on error
      setSessions(prev =>
        prev.map(session => {
          if (session.id === sessionId) {
            return {
              ...session,
              is_locked: false,
              locked_at: null,
              locked_by: null,
            }
          }
          return session
        })
      )
      throw err
    }
  }, [])

  const unlockSession = useCallback(async (sessionId: string, clientId?: string): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      // Update session state optimistically first
      setSessions(prev =>
        prev.map(session => {
          if (session.id === sessionId) {
            return {
              ...session,
              is_locked: false,
              locked_at: null,
              locked_by: null,
            }
          }
          return session
        })
      )

      // Call API to unlock on backend
      await sessionApi.unlockSession(sessionId, clientId)
      setIsLoading(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unlock session'
      setError(errorMessage)
      setIsLoading(false)
      // Revert optimistic update on error
      setSessions(prev =>
        prev.map(session => {
          if (session.id === sessionId) {
            return {
              ...session,
              is_locked: true,
              locked_at: new Date().toISOString(),
              locked_by: clientId || `client_${sessionId}_${Date.now()}`,
            }
          }
          return session
        })
      )
      throw err
    }
  }, [])

  const value: SessionsContextType = {
    sessions,
    currentSessionId,
    currentScenarioId,
    sessionEnded,
    isLoading,
    error,
    createSession,
    sendMessage,
    getFeedback,
    endSession,
    setCurrentSessionId,
    clearError,
    lockSession,
    unlockSession,
  }

  return (
    <SessionsContext.Provider value={value}>
      {children}
    </SessionsContext.Provider>
  )
}

export function useSessions(): SessionsContextType {
  const context = useContext(SessionsContext)
  if (context === undefined) throw new Error('useSessions must be used within a SessionsProvider')
  return context
}
