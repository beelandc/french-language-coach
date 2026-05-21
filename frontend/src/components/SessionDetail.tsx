import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { sessionApi } from '../utils/api'
import type { SessionDetailProps, Session, Message, Feedback } from '../types'
import MessageBubble from './MessageBubble'
import ScoreCard from './ScoreCard'
import CorrectionItem from './CorrectionItem'
import ConfirmationModal from './ConfirmationModal'
import { generateFeedbackPDF } from '../utils/pdfExport'

/**
 * SessionDetail component displays the full conversation transcript and feedback report
 * for a session. Updated for Issue #160 to support session continuation.
 */
export default function SessionDetail({ sessionId }: SessionDetailProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isExportingPDF, setIsExportingPDF] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const navigate = useNavigate()

  // Check if session is locked (cannot be deleted when locked)
  // Updated for Issue #160: Now based on is_locked instead of ended_at
  const isSessionLocked = session ? session.is_locked === true : false
  
  // Check if session is incomplete (can be continued)
  const isIncompleteSession = session ? session.ended_at === null : false

  // Map scenario IDs to human-readable names
  const getScenarioName = useCallback((scenarioId: string): string => {
    const scenarioNames: Record<string, string> = {
      'cafe_order': 'Ordering at a Café',
      'ask_directions': 'Asking for Directions',
      'job_interview': 'Job Interview',
      'hotel_checkin': 'Hotel Check-in',
      'shopping': 'Shopping for Clothes',
      'doctor_visit': 'Doctor\'s Visit',
      'train_travel': 'Train Travel',
      'restaurant_dining': 'Dining at a Restaurant',
      'apartment_rental': 'Apartment Rental',
      'museum_visit': 'Museum Visit',
    }
    return scenarioNames[scenarioId] || scenarioId
  }, [])

  // Fetch session data on mount and when sessionId changes
  useEffect(() => {
    const fetchSession = async () => {
      if (!sessionId) {
        setError('No session ID provided')
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        
        // Convert sessionId to number for backend (backend expects integer ID)
        const numericSessionId = parseInt(sessionId, 10)
        if (isNaN(numericSessionId)) {
          throw new Error('Invalid session ID')
        }
        
        const data = await sessionApi.getSession(sessionId)
        
        // Transform backend message format to frontend format
        // Backend returns messages as {role: string, content: string}
        // Frontend expects {id: string, session_id: string, role: MessageRole, content: string, created_at: string}
        const transformedMessages: Message[] = (data.messages || []).map((msg, index) => ({
          id: String(index),
          session_id: String(data.id),
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          created_at: data.created_at,
        }))

        // Transform feedback to ensure all fields exist
        const feedback: Feedback | null = data.feedback ? {
          grammar_score: data.feedback.grammar_score ?? 0,
          vocabulary_score: data.feedback.vocabulary_score ?? 0,
          fluency_score: data.feedback.fluency_score ?? 0,
          overall_score: data.feedback.overall_score ?? 0,
          strengths: data.feedback.strengths ?? [],
          focus_area: data.feedback.focus_area ?? '',
          example_corrections: data.feedback.example_corrections ?? [],
        } : null

        setSession({
          ...data,
          id: String(data.id),
          messages: transformedMessages,
          feedback,
        })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load session'
        setError(errorMessage)
        setSession(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSession()
  }, [sessionId])

  const handleBack = () => {
    navigate('/')
  }

  // Handle continue session button click - navigate to chat interface
  const handleContinueSession = useCallback(() => {
    if (sessionId) {
      navigate(`/chat/${sessionId}`)
    }
  }, [sessionId, navigate])

  // Handle delete button click - open confirmation modal
  const handleDeleteClick = useCallback(() => {
    setDeleteError(null)
    setShowDeleteModal(true)
  }, [])

  // Handle delete confirmation
  const handleConfirmDelete = useCallback(async () => {
    if (!sessionId) return

    setIsDeleting(true)
    setDeleteError(null)

    try {
      await sessionApi.deleteSession(sessionId)
      // On success, redirect to home page
      navigate('/')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete session'
      setDeleteError(errorMessage)
      setShowDeleteModal(false)
    } finally {
      setIsDeleting(false)
    }
  }, [sessionId, navigate])

  // Handle delete cancellation
  const handleCancelDelete = useCallback(() => {
    setShowDeleteModal(false)
    setDeleteError(null)
  }, [])

  // Format date for display in modal
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  // Get scenario name for display
  const getScenarioDisplayName = useCallback((): string => {
    if (!session) return ''
    return getScenarioName(session.scenario_id)
  }, [session, getScenarioName])

  // Handle PDF export
  const handleExportToPDF = useCallback(async () => {
    if (!session?.feedback || !sessionId) {
      setPdfError('No feedback available to export')
      return;
    }

    try {
      setIsExportingPDF(true);
      setPdfError(null);
      await generateFeedbackPDF(session.feedback, sessionId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export PDF';
      setPdfError(errorMessage);
      console.error('Error exporting PDF:', err);
    } finally {
      setIsExportingPDF(false);
    }
  }, [session?.feedback, sessionId]);

  // Clear PDF error after some time
  useEffect(() => {
    if (pdfError) {
      const timer = setTimeout(() => setPdfError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [pdfError]);

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="session-detail">
          <p>Loading session...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="session-detail">
          <div className="error-message">{error}</div>
          <button className="btn-secondary" onClick={handleBack}>
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="page-container">
        <div className="session-detail">
          <div>Session not found</div>
          <button className="btn-secondary" onClick={handleBack}>
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  const hasMessages = session.messages && session.messages.length > 0
  const hasFeedback = session.feedback !== null

  return (
    <div className="session-detail">
      {/* Header */}
      <div className="session-header">
        <button className="btn-secondary" onClick={handleBack}>
          Back
        </button>
        <h2>Session Details: {getScenarioName(session.scenario_id)}</h2>
      </div>

      {/* Session metadata */}
      <div className="session-meta">
        <p>
          <strong>Started:</strong> {new Date(session.created_at).toLocaleString()}
          {session.ended_at && (
            <span>
              {' | '}
              <strong>Ended:</strong> {new Date(session.ended_at).toLocaleString()}
            </span>
          )}
          {session.difficulty && (
            <span>
              {' | '}
              <strong>Difficulty:</strong> {session.difficulty}
            </span>
          )}
        </p>
      </div>

      {/* Messages Section */}
      <div className="session-messages">
        <h3>Conversation Transcript</h3>
        {hasMessages ? (
          <div className="messages-list">
            {session.messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No messages in this session</p>
          </div>
        )}
      </div>

      {/* Feedback Section */}
      {hasFeedback ? (
        <div className="session-feedback">
          <div className="session-feedback-header">
            <h3>Feedback Report</h3>
            <button 
              className="btn-export" 
              onClick={handleExportToPDF}
              disabled={isExportingPDF}
            >
              {isExportingPDF ? 'Exporting...' : 'Export to PDF'}
            </button>
          </div>
          
          {/* PDF Error Notice */}
          {pdfError && (
            <div className="pdf-error-notice">
              <span>⚠️ {pdfError}</span>
            </div>
          )}
          
          {/* Scores */}
          <div className="feedback-section">
            <h4>Scores</h4>
            <div className="scores-grid">
              <ScoreCard label="Grammar" value={session.feedback.grammar_score} />
              <ScoreCard label="Vocabulary" value={session.feedback.vocabulary_score} />
              <ScoreCard label="Fluency" value={session.feedback.fluency_score} />
              <ScoreCard label="Overall" value={session.feedback.overall_score} />
            </div>
          </div>

          {/* Strengths */}
          <div className="feedback-section">
            <h4>Strengths</h4>
            {session.feedback.strengths && session.feedback.strengths.length > 0 ? (
              <ul className="strengths-list">
                {session.feedback.strengths.map((strength, index) => (
                  <li key={index}>{strength}</li>
                ))}
              </ul>
            ) : (
              <p>No specific strengths identified.</p>
            )}
          </div>

          {/* Focus Area */}
          <div className="feedback-section">
            <h4>Focus Area</h4>
            {session.feedback.focus_area ? (
              <div className="focus-area">
                <h5>Priority: Improve your {session.feedback.focus_area}</h5>
              </div>
            ) : (
              <p>No focus area specified.</p>
            )}
          </div>

          {/* Corrections */}
          {session.feedback.example_corrections && 
           session.feedback.example_corrections.length > 0 && (
            <div className="feedback-section">
              <h4>Example Corrections</h4>
              <div className="corrections-list">
                {session.feedback.example_corrections.map((correction, index) => (
                  <CorrectionItem key={index} correction={correction} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="session-feedback">
          <p className="info-message">
            Feedback not yet available for this session.
          </p>
        </div>
      )}

      {/* Delete error message */}
      {deleteError && (
        <div className="session-message error" role="alert">
          {deleteError}
        </div>
      )}

      {/* Actions at bottom */}
      <div className="session-actions">
        <button className="btn-secondary" onClick={handleBack}>
          Back to Home
        </button>
        
        {/* Continue Session button - only show for incomplete sessions */}
        {isIncompleteSession && (
          <button
            className="btn-primary session-continue-button"
            onClick={handleContinueSession}
            disabled={isDeleting}
            data-testid="session-detail-continue-button"
            aria-label={`Continue session ${getScenarioDisplayName()}`}
          >
            Continue Session
          </button>
        )}
        
        {/* Delete button - only show for unlocked sessions */}
        {!isSessionLocked && (
          <button
            className="btn-danger session-delete-button"
            onClick={handleDeleteClick}
            disabled={isDeleting}
            data-testid="session-detail-delete-button"
            aria-label={`Delete session ${getScenarioDisplayName()}`}
          >
            {isDeleting ? 'Deleting...' : 'Delete Session'}
          </button>
        )}
      </div>

      {/* Confirmation Modal for delete */}
      {showDeleteModal && session && (
        <ConfirmationModal
          isOpen={showDeleteModal}
          onCancel={handleCancelDelete}
          onConfirm={handleConfirmDelete}
          title="Delete Session"
          message={
            session.ended_at === null
              ? `Are you sure you want to delete "${getScenarioDisplayName()}" from ${formatDate(session.created_at)}? This is an INCOMPLETE session. Deleting it will permanently remove all conversation data. This action cannot be undone.`
              : `Are you sure you want to delete "${getScenarioDisplayName()}" from ${formatDate(session.created_at)}? This action cannot be undone.`
          }
          confirmText="Delete"
          cancelText="Cancel"
          isLoading={isDeleting}
        />
      )}
    </div>
  )
}
