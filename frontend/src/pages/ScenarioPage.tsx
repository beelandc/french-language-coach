import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import ScenarioSelector from '../components/ScenarioSelector'
import QuickAccessSession from '../components/QuickAccessSession'
import { sessionApi } from '../utils/api'
import type { SessionSummary, SessionListResponse } from '../types'

/**
 * ScenarioPage displays the scenario selection interface for Conversation Practice.
 * Also hosts the Recent Conversation Sessions (Quick Access) section below the scenarios,
 * relocated from IndexPage (Issue #214) since these sessions are conversation-specific.
 */
export default function ScenarioPage() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch recent sessions on component mount
  useEffect(() => {
    const fetchRecentSessions = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response: SessionListResponse = await sessionApi.listSessions(1, 5)

        // Transform backend response: id as number to string
        const transformedSessions = response.sessions.map(session => ({
          ...session,
          id: String(session.id),
          overall_score: session.overall_score !== null && session.overall_score !== undefined
            ? session.overall_score
            : null,
        }))

        setSessions(transformedSessions)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load recent sessions'
        setError(errorMessage)
        setSessions([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchRecentSessions()
  }, [])

  // Handle session resume
  const handleSessionResume = useCallback((sessionId: string) => {
    navigate(`/sessions/${sessionId}`)
  }, [navigate])

  // Handle retry for session fetch
  const handleRetry = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response: SessionListResponse = await sessionApi.listSessions(1, 5)
      const transformedSessions = response.sessions.map(session => ({
        ...session,
        id: String(session.id),
        overall_score: session.overall_score !== null && session.overall_score !== undefined
          ? session.overall_score
          : null,
      }))

      setSessions(transformedSessions)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load recent sessions'
      setError(errorMessage)
      setSessions([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  return (
    <div className="page-container" data-testid="scenario-page">
      <h2>Select a Conversation Scenario</h2>
      <ScenarioSelector />

      {/* Quick Access Section - Recent Conversation Sessions (Issue #214) */}
      <section className="quick-access-section" data-testid="quick-access-section">
        <div className="quick-access-header">
          <h2 className="quick-access-title">Recent Conversation Sessions</h2>
          <button
            className="view-all-link btn-secondary"
            onClick={() => navigate('/sessions')}
            aria-label="View all sessions"
            data-testid="view-all-sessions-btn"
          >
            View All Sessions
          </button>
        </div>

        {isLoading ? (
          <div className="loading-state" data-testid="quick-access-loading">
            <p>Loading recent sessions...</p>
            <div className="spinner spinner-small" />
          </div>
        ) : error ? (
          <div className="error-state" data-testid="quick-access-error">
            <p className="error-message">{error}</p>
            <button
              className="btn-primary"
              onClick={handleRetry}
              aria-label="Retry loading sessions"
              data-testid="quick-access-retry-btn"
            >
              Retry
            </button>
          </div>
        ) : sessions.length === 0 ? (
          <div className="empty-state" data-testid="quick-access-empty">
            <p>No recent sessions. Start a new one!</p>
            <button
              className="btn-primary"
              onClick={() => navigate('/scenarios')}
              aria-label="Start a new session"
              data-testid="quick-access-start-btn"
            >
              Start Now
            </button>
          </div>
        ) : (
          <div className="quick-access-list" data-testid="quick-access-list">
            {sessions.map((session) => (
              <QuickAccessSession
                key={session.id}
                session={session}
                onClick={handleSessionResume}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
