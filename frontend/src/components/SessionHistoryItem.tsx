import type { SessionHistoryItemProps, SessionSummary } from '../types'

/**
 * SessionHistoryItem component displays a single session in the history list.
 * It shows scenario name, date, and overall score (if available).
 * Clicking the item triggers the onClick callback with the session ID.
 */
export default function SessionHistoryItem({ session, onClick }: SessionHistoryItemProps) {
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

  // Handle click on the session item
  const handleClick = () => {
    onClick(session.id)
  }

  return (
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
      </div>
    </div>
  )
}
