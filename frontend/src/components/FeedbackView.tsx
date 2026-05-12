import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessions } from '../hooks/useSessions'
import type { FeedbackViewProps, Feedback, Correction } from '../types'

interface ScoreCardProps {
  label: string
  value: number
}

function ScoreCard({ label, value }: ScoreCardProps) {
  return (
    <div className="score-card">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  )
}

interface CorrectionItemProps {
  correction: Correction
}

function CorrectionItem({ correction }: CorrectionItemProps) {
  return (
    <div className="correction-item">
      <div className="original">{correction.original}</div>
      <div className="corrected">{correction.corrected}</div>
      <div className="explanation">{correction.explanation}</div>
    </div>
  )
}

export default function FeedbackView({ sessionId }: FeedbackViewProps) {
  const { getFeedback } = useSessions()
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const loadFeedback = async () => {
      try {
        if (sessionId) {
          const fb = await getFeedback(sessionId)
          setFeedback(fb)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load feedback')
      } finally {
        setIsLoading(false)
      }
    }
    
    loadFeedback()
  }, [sessionId, getFeedback])

  const handleBackToChat = () => {
    navigate(`/chat/${sessionId}`)
  }

  const handleNewSession = () => {
    navigate('/')
  }

  if (isLoading) {
    return <div>Loading feedback...</div>
  }

  if (error) {
    return <div className="error-message">{error}</div>
  }

  if (!feedback) {
    return <div>No feedback available for this session.</div>
  }

  return (
    <div className="feedback-container">
      <div className="feedback-header">
        <h2>Session Feedback</h2>
        <button className="btn-secondary" onClick={handleBackToChat}>
          Back to Chat
        </button>
        <button className="btn-primary" onClick={handleNewSession}>
          New Session
        </button>
      </div>

      <div className="feedback-content">
        {/* Scores Section */}
        <div className="feedback-section">
          <h3>Scores</h3>
          <div className="scores-grid">
            <ScoreCard label="Grammar" value={feedback.grammar_score} />
            <ScoreCard label="Vocabulary" value={feedback.vocabulary_score} />
            <ScoreCard label="Fluency" value={feedback.fluency_score} />
            <ScoreCard label="Overall" value={feedback.overall_score} />
          </div>
        </div>

        {/* Strengths Section */}
        <div className="feedback-section">
          <h3>Strengths</h3>
          <ul className="strengths-list">
            {feedback.strengths.map((strength, index) => (
              <li key={index}>{strength}</li>
            ))}
          </ul>
        </div>

        {/* Focus Area Section */}
        <div className="feedback-section">
          <h3>Focus Area</h3>
          <div className="focus-area">
            <h4>Priority: Improve your {feedback.focus_area}</h4>
          </div>
        </div>

        {/* Corrections Section */}
        {feedback.example_corrections && feedback.example_corrections.length > 0 && (
          <div className="feedback-section">
            <h3>Example Corrections</h3>
            <div className="corrections-list">
              {feedback.example_corrections.map((correction, index) => (
                <CorrectionItem key={index} correction={correction} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
