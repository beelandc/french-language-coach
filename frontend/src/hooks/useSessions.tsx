import { useState, useCallback, createContext, useContext } from 'react'
import { sessionApi } from '../utils/api'
import type { Session, Message, Feedback } from '../types'

interface SessionsContextType {
  sessions: Session[]
  currentSessionId: string | null
  currentScenarioId: string | null
  sessionEnded: boolean
  isLoading: boolean
  error: string | null
  createSession: (scenarioId: string) => Promise<string>
  sendMessage: (sessionId: string, content: string) => Promise<Message>
  getFeedback: (sessionId: string) => Promise<Feedback>
  endSession: () => void
  setCurrentSessionId: (id: string | null) => void
  clearError: () => void
}

const SessionsContext = createContext<SessionsContextType | undefined>(undefined)

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

  const createSession = useCallback(async (scenarioId: string): Promise<string> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await sessionApi.create(scenarioId)
      const newSessionId = response.id
      setCurrentSessionId(newSessionId)
      setCurrentScenarioId(scenarioId)
      setSessionEnded(false)

      setSessions(prev => [
        ...prev,
        {
          id: newSessionId,
          scenario_id: scenarioId,
          created_at: response.created_at,
          ended_at: null,
          messages: [],
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

      setSessions(prev =>
        prev.map(session => {
          if (session.id === sessionId) {
            return {
              ...session,
              messages: [
                ...session.messages,
                {
                  id: Date.now().toString(),
                  session_id: sessionId,
                  role: 'user' as const,
                  content,
                  created_at: new Date().toISOString(),
                },
                {
                  id: (Date.now() + 1).toString(),
                  session_id: sessionId,
                  role: response.role as 'user' | 'assistant',
                  content: response.content,
                  created_at: new Date().toISOString(),
                },
              ],
            }
          }
          return session
        })
      )

      const message: Message = {
        id: (Date.now() + 1).toString(),
        session_id: sessionId,
        role: response.role as 'user' | 'assistant',
        content: response.content,
        created_at: new Date().toISOString(),
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

  const getFeedback = useCallback(async (sessionId: string): Promise<Feedback> => {
    setIsLoading(true)
    setError(null)

    try {
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
  }, [])

  const endSession = useCallback(() => setSessionEnded(true), [])

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
