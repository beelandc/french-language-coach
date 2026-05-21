import { useState, useCallback } from 'react'
import ConfirmationModal from './ConfirmationModal'
import type { SessionHistoryItemProps, SessionSummary } from '../types'

/**
 * SessionHistoryItem component displays a single session in the history list.
 * It shows scenario name, date, and overall score (if available).
 * Clicking the item triggers the onClick callback with the session ID.
 * If onDelete is provided and session is not locked, a delete button is shown.
 * 
 * Updated for Issue #160: Delete button disabled only when session is locked.
 */
export default function SessionHistoryItem({ session, onClick, onDelete }: SessionHistoryItemProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Check if session is locked (cannot be deleted when locked)
  // Updated for Issue #160: Now based on is_locked instead of ended_at
  const isSessionLocked = session.is_locked === true

  // Format the date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // Get time portion for display
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Format the score for display
  const formatScore = (score: number | null): string => {
    if (score === null || score === undefined) {
      return 'No score yet'
    }
    return `${score}%`
  }

  // Handle click on the session item (view details)
  const handleClick = () => {
    onClick(session.id)
  }

  // Handle delete button click - open confirmation modal
  const handleDeleteClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation() // Prevent triggering the item click
    setDeleteError(null)
    setShowDeleteModal(true)
  }, [])

  // Handle delete confirmation
  const handleConfirmDelete = useCallback(async () => {
    if (!onDelete) return

    setIsDeleting(true)
    setDeleteError(null)

    try {
      await onDelete(session.id)
      // Modal will be closed by parent after successful deletion
      // onDelete should handle removing from UI
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete session'
      setDeleteError(errorMessage)
      setShowDeleteModal(false)
    } finally {
      setIsDeleting(false)
    }
  }, [onDelete, session.id])

  // Handle delete cancellation
  const handleCancelDelete = useCallback(() => {
    setShowDeleteModal(false)
    setDeleteError(null)
  }, [])

  // Get tooltip text for disabled delete button
  // Updated for Issue #160: Now based on lock status
  const getDeleteButtonTooltip = (): string => {
    if (isSessionLocked) {
      return 'Session is currently in use by another tab'
    }
    // For incomplete sessions, add a warning
    if (session.ended_at === null) {
      return 'This is an incomplete session. Deleting it will permanently remove all conversation data.'
    }
    return ''
  }

  return (
    <>
      <div className="session-item" onClick={handleClick}>
        <div className="session-item-header">
          <h4>{session.scenario_name}</h4>
          <span className="session-difficulty">{session.difficulty}</span>
        </div>
        
        <div className="session-item-meta">
          <span className="session-date">
            {formatDate(session.created_at)} at {formatTime(session.created_at)}
          </span>
          {session.ended_at && (
            <span className="session-ended">
              (Ended: {formatDate(session.ended_at)})
            </span>
          )}
        </div>
        
        <div className="session-item-footer">
          {session.overall_score !== null && session.overall_score !== undefined ? (
            <span className="session-score">
              Overall Score: <strong>{formatScore(session.overall_score)}</strong>
            </span>
          ) : (
            <span className="session-score session-score-pending">
              {formatScore(null)}
            </span>
          )}
          <span className="view-detail">Click to view details &rarr;</span>
          
          {/* Delete button - only show if onDelete is provided and session is not locked */}
          {onDelete && (
            <button
              className="session-item-delete"
              onClick={handleDeleteClick}
              disabled={isSessionLocked || isDeleting}
              title={getDeleteButtonTooltip()}
              data-testid="session-delete-button"
              aria-label={`Delete session ${session.scenario_name}`}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal for delete */}
      {showDeleteModal && (
        <ConfirmationModal
          isOpen={showDeleteModal}
          onCancel={handleCancelDelete}
          onConfirm={handleConfirmDelete}
          title="Delete Session"
          message={
            session.ended_at === null
              ? `Are you sure you want to delete "${session.scenario_name}" from ${formatDate(session.created_at)}? This is an INCOMPLETE session. Deleting it will permanently remove all conversation data. This action cannot be undone.`
              : `Are you sure you want to delete "${session.scenario_name}" from ${formatDate(session.created_at)}? This action cannot be undone.`
          }
          confirmText="Delete"
          cancelText="Cancel"
          isLoading={isDeleting}
        />
      )}

      {/* Delete error message */}
      {deleteError && (
        <div className="session-message error" role="alert">
          {deleteError}
        </div>
      )}
    </>
  )
}
