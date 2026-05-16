import { useState, useEffect, useCallback } from 'react'
import { sessionApi } from '../utils/api'
import type { SessionHistoryProps, SessionSummary, SessionListResponse } from '../types'
import SessionHistoryItem from './SessionHistoryItem'

/**
 * SessionHistory component displays a list of past user sessions.
 * It handles loading, error, and empty states gracefully.
 * Supports session deletion with success messages.
 */
export default function SessionHistory({ onSessionClick }: SessionHistoryProps) {
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Fetch session list on mount
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const response: SessionListResponse = await sessionApi.listSessions(1, 10)
        
        // Transform backend response: backend returns id as number, we need string
        const transformedSessions = response.sessions.map(session => ({
          ...session,
          id: String(session.id),
          overall_score: session.overall_score !== null && session.overall_score !== undefined 
            ? session.overall_score 
            : null,
        }))
        
        setSessions(transformedSessions)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load session history'
        setError(errorMessage)
        setSessions([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchSessions()
  }, []) // Empty dependency array means this runs once on mount

  // Handle retry after error
  const handleRetry = useCallback(() => {
    setIsLoading(true)
    setError(null)
    
    sessionApi.listSessions(1, 10)
      .then((response: SessionListResponse) => {
        const transformedSessions = response.sessions.map(session => ({
          ...session,
          id: String(session.id),
          overall_score: session.overall_score !== null && session.overall_score !== undefined 
            ? session.overall_score 
            : null,
        }))
        setSessions(transformedSessions)
      })
      .catch((err) => {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load session history'
        setError(errorMessage)
        setSessions([])
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  // Handle session deletion
  const handleDeleteSession = useCallback(async (sessionId: string) => {
    try {
      await sessionApi.deleteSession(sessionId)
      
      // Optimistically remove from UI (backend already returned 204)
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      setSuccessMessage('Session deleted successfully')
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null)
      }, 3000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete session'
      throw new Error(errorMessage)
    }
  }, [])

  if (isLoading) {
    return (
      <div className="session-history">
        <h3>Session History</h3>
        <div className="loading-state">
          <p>Loading session history...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="session-history">
        <h3>Session History</h3>
        <div className="error-state">
          <p className="error-message">{error}</p>
          <button className="btn-primary" onClick={handleRetry}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="session-history">
        <h3>Session History</h3>
        <div className="empty-state">
          <p>No sessions yet. Start a new session!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="session-history">
      <h3>Session History</h3>
      
      {/* Success message for delete operations */}
      {successMessage && (
        <div className="session-message success" role="alert">
          {successMessage}
        </div>
      )}
      
      <div className="sessions-list">
        {sessions.map((session) => (
          <SessionHistoryItem
            key={session.id}
            session={session}
            onClick={onSessionClick}
            onDelete={handleDeleteSession}
          />
        ))}
      </div>
    </div>
  )
}
