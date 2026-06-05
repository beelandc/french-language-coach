import { useNavigate } from 'react-router-dom'
import type { QuickAccessSessionProps } from '../types'

/**
 * QuickAccessSession component displays a compact session card for the Quick Access section.
 * Shows session details and allows resuming the session.
 */
export default function QuickAccessSession({ 
  session, 
  onClick 
}: QuickAccessSessionProps) {
  const navigate = useNavigate()
  
  const handleResumeClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick(session.id)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick(session.id)
    }
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  // Get scenario name - fallback to scenario_id if name not available
  const scenarioName = session.scenario_name || session.scenario_id

  return (
    <div 
      className="quick-access-session"
      onClick={() => onClick(session.id)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Resume session: ${scenarioName}, created on ${formatDate(session.created_at)}`}
      data-testid="quick-access-session"
    >
      <div className="quick-access-session-header">
        <h4 className="quick-access-session-title" data-testid="quick-access-session-title">
          {scenarioName}
        </h4>
        
        {session.difficulty && (
          <span className={`session-difficulty quick-access-difficulty`}>
            {session.difficulty}
          </span>
        )}
      </div>
      
      <div className="quick-access-session-meta">
        <span className="quick-access-session-date" data-testid="quick-access-session-date">
          {formatDate(session.created_at)}
        </span>
        
        {session.ended_at && (
          <span className="quick-access-session-ended">
            (Ended: {formatDate(session.ended_at)})
          </span>
        )}
      </div>
      
      <div className="quick-access-session-footer">
        {session.overall_score !== null && session.overall_score !== undefined ? (
          <span className="quick-access-session-score">
            Score: <strong>{session.overall_score}/100</strong>
          </span>
        ) : (
          <span className="quick-access-session-score quick-access-session-score-pending">
            In Progress
          </span>
        )}
        
        <button 
          className="quick-access-resume-btn btn-primary"
          onClick={handleResumeClick}
          aria-label={`Resume session ${scenarioName}`}
          data-testid="quick-access-resume-btn"
        >
          Resume
        </button>
      </div>
    </div>
  )
}
