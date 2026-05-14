/**
 * Storybook Mock Utilities
 * 
 * This file provides mock implementations of hooks and contexts
 * for use in Storybook stories.
 */

import React, { createContext, useContext, useState, useCallback } from 'react'
import type { Session, Message, Feedback, SessionsContextType } from '@/types'

// Mock data
const mockMessages: Message[] = [
  {
    id: '1',
    session_id: 'mock-session-1',
    role: 'assistant',
    content: 'Bonjour ! Comment puis-je vous aider aujourd\'hui ?',
    created_at: '2024-01-15T10:30:00Z',
  },
  {
    id: '2',
    session_id: 'mock-session-1',
    role: 'user',
    content: 'Je voudrais un café s\'il vous plaît.',
    created_at: '2024-01-15T10:30:05Z',
  },
  {
    id: '3',
    session_id: 'mock-session-1',
    role: 'assistant',
    content: 'Quel type de café préférez-vous ? Nous avons des expressos, des cappuccinos, et des lattés.',
    created_at: '2024-01-15T10:30:10Z',
  },
]

const mockFeedback: Feedback = {
  session_id: 'mock-session-1',
  grammar_score: 85,
  vocabulary_score: 92,
  fluency_score: 78,
  overall_score: 88,
  strengths: ['Good vocabulary usage', 'Natural phrasing', 'Correct use of polite forms'],
  focus_area: 'grammar',
  example_corrections: [
    {
      original: 'Je veux un café',
      corrected: 'Je voudrais un café',
      explanation: 'Using "voudrais" (conditional) is more polite than "veux" (present) when making requests.',
    },
    {
      original: 'Il faut que tu viens',
      corrected: 'Il faut que tu viennes',
      explanation: 'After "que" in expressions of necessity, the subjunctive mood is required: "viennes" instead of "viens".',
    },
  ],
}

const mockSession: Session = {
  id: 'mock-session-1',
  scenario_id: 'cafe_order',
  created_at: '2024-01-15T10:30:00Z',
  ended_at: null,
  messages: mockMessages,
  feedback: null,
}

const mockEndedSession: Session = {
  id: 'mock-ended-session-1',
  scenario_id: 'cafe_order',
  created_at: '2024-01-15T10:30:00Z',
  ended_at: '2024-01-15T10:35:00Z',
  messages: mockMessages,
  feedback: mockFeedback,
}

const mockEmptySession: Session = {
  id: 'empty-session-1',
  scenario_id: 'cafe_order',
  created_at: '2024-01-15T10:30:00Z',
  ended_at: null,
  messages: [],
  feedback: null,
}

// Mock Sessions Context
const MockSessionsContext = createContext<SessionsContextType | undefined>(undefined)

interface MockSessionsProviderProps {
  children: React.ReactNode
  initialSessions?: Session[]
  currentSessionId?: string | null
  currentScenarioId?: string | null
  sessionEnded?: boolean
  isLoading?: boolean
  error?: string | null
}

export function MockSessionsProvider({
  children,
  initialSessions = [mockSession],
  currentSessionId = 'mock-session-1',
  currentScenarioId = 'cafe_order',
  sessionEnded = false,
  isLoading = false,
  error = null,
}: MockSessionsProviderProps) {
  const [sessions, setSessions] = useState<Session[]>(initialSessions)
  const [currentSessionIdState, setCurrentSessionId] = useState<string | null>(currentSessionId)
  const [currentScenarioIdState, setCurrentScenarioId] = useState<string | null>(currentScenarioId)
  const [sessionEndedState, setSessionEnded] = useState<boolean>(sessionEnded)
  const [isLoadingState, setIsLoading] = useState<boolean>(isLoading)
  const [errorState, setError] = useState<string | null>(error)

  const clearError = useCallback(() => setError(null), [])

  const createSession = useCallback(async (scenarioId: string): Promise<string> => {
    setIsLoading(true)
    setError(null)

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))

    const newSessionId = `new-mock-session-${Date.now()}`
    setCurrentSessionId(newSessionId)
    setCurrentScenarioId(scenarioId)
    setSessionEnded(false)

    setSessions(prev => [
      ...prev,
      {
        id: newSessionId,
        scenario_id: scenarioId,
        created_at: new Date().toISOString(),
        ended_at: null,
        messages: [],
        feedback: null,
      },
    ])

    setIsLoading(false)
    return newSessionId
  }, [])

  const sendMessage = useCallback(async (sessionId: string, content: string): Promise<Message> => {
    if (sessionEndedState) throw new Error('This session has ended. Please start a new session.')

    setIsLoading(true)
    setError(null)

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))

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
                role: 'user',
                content,
                created_at: now,
              },
              {
                id: String(timestamp + 1),
                session_id: sessionId,
                role: 'assistant',
                content: `J'ai reçu: "${content}". Comment puis-je vous aider ?`,
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
      role: 'assistant',
      content: `J'ai reçu: "${content}". Comment puis-je vous aider ?`,
      created_at: now,
    }

    setIsLoading(false)
    return message
  }, [sessionEndedState])

  const getFeedback = useCallback(async (sessionId: string, forceRefresh: boolean = false): Promise<Feedback | null> => {
    setIsLoading(true)
    setError(null)

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))

    // Check if we already have feedback for this session
    const existingSession = sessions.find(s => s.id === sessionId)
    if (existingSession?.feedback && !forceRefresh) {
      setIsLoading(false)
      return existingSession.feedback
    }

    // Return mock feedback
    setSessions(prev =>
      prev.map(session => {
        if (session.id === sessionId) {
          return {
            ...session,
            feedback: mockFeedback,
            ended_at: new Date().toISOString(),
          }
        }
        return session
      })
    )

    setSessionEnded(true)
    setIsLoading(false)
    return mockFeedback
  }, [sessions])

  const endSession = useCallback(() => setSessionEnded(true), [])

  const value: SessionsContextType = {
    sessions,
    currentSessionId: currentSessionIdState,
    currentScenarioId: currentScenarioIdState,
    sessionEnded: sessionEndedState,
    isLoading: isLoadingState,
    error: errorState,
    createSession,
    sendMessage,
    getFeedback,
    endSession,
    setCurrentSessionId,
    clearError,
  }

  return (
    <MockSessionsContext.Provider value={value}>
      {children}
    </MockSessionsContext.Provider>
  )
}

// Mock useSessions hook
export function useMockSessions(): SessionsContextType {
  const context = useContext(MockSessionsContext)
  if (context === undefined) throw new Error('useMockSessions must be used within a MockSessionsProvider')
  return context
}

// Preset configurations for different scenarios
export const StorybookSessionsProvider = {
  WithMessages: ({ children }: { children: React.ReactNode }) => (
    <MockSessionsProvider initialSessions={[mockSession]} currentSessionId="mock-session-1">
      {children}
    </MockSessionsProvider>
  ),
  EmptySession: ({ children }: { children: React.ReactNode }) => (
    <MockSessionsProvider initialSessions={[mockEmptySession]} currentSessionId="empty-session-1">
      {children}
    </MockSessionsProvider>
  ),
  WithFeedback: ({ children }: { children: React.ReactNode }) => (
    <MockSessionsProvider initialSessions={[mockEndedSession]} currentSessionId="mock-ended-session-1" sessionEnded={true}>
      {children}
    </MockSessionsProvider>
  ),
  Loading: ({ children }: { children: React.ReactNode }) => (
    <MockSessionsProvider initialSessions={[]} currentSessionId={null} isLoading={true}>
      {children}
    </MockSessionsProvider>
  ),
  Error: ({ children }: { children: React.ReactNode }) => (
    <MockSessionsProvider initialSessions={[]} currentSessionId={null} error="Failed to load sessions">
      {children}
    </MockSessionsProvider>
  ),
}

export default MockSessionsProvider
