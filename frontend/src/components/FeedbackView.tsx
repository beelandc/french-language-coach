import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessions } from '../hooks/useSessions'
import type { FeedbackViewProps, Feedback } from '../types'
import ScoreCard from './ScoreCard'
import CorrectionItem from './CorrectionItem'
import { generateFeedbackPDF } from '../utils/pdfExport'

export default function FeedbackView({ sessionId }: FeedbackViewProps) {
  const { getFeedback, isLoading: isSessionsLoading } = useSessions()
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isExportingPDF, setIsExportingPDF] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const navigate = useNavigate()

  // Load feedback when component mounts
  useEffect(() => {
    const loadFeedback = async () => {
      if (!sessionId) {
        setError('No session ID provided')
        setIsLoading(false)
        return
      }
      
      try {
        // Use cached feedback from hook if available (forceRefresh=false by default)
        const fb = await getFeedback(sessionId)
        if (fb) {
          setFeedback(fb)
        }
        setIsLoading(false)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load feedback'
        setError(errorMessage)
        setIsLoading(false)
        console.error('Error loading feedback:', err)
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

  const handleExportToPDF = useCallback(async () => {
    if (!feedback || !sessionId) {
      setPdfError('No feedback available to export')
      return;
    }

    try {
      setIsExportingPDF(true);
      setPdfError(null);
      await generateFeedbackPDF(feedback, sessionId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export PDF';
      setPdfError(errorMessage);
      console.error('Error exporting PDF:', err);
    } finally {
      setIsExportingPDF(false);
    }
  }, [feedback, sessionId]);

  // Clear PDF error after some time
  useEffect(() => {
    if (pdfError) {
      const timer = setTimeout(() => setPdfError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [pdfError]);

  if (isLoading || isSessionsLoading) {
    return <div className="page-container" data-testid="loading-feedback">Loading feedback...</div>
  }

  if (error) {
    return (
      <div className="page-container" data-testid="feedback-error-container">
        <div className="error-message" data-testid="feedback-error">{error}</div>
        <button className="btn-primary" onClick={handleNewSession} data-testid="back-to-home-button">
          Back to Home
        </button>
      </div>
    )
  }

  if (!feedback) {
    return (
      <div className="page-container" data-testid="no-feedback-container">
        <div>No feedback available for this session.</div>
        <button className="btn-primary" onClick={handleNewSession} data-testid="back-to-home-button">
          Back to Home
        </button>
      </div>
    )
  }

  return (
    <div className="feedback-container" data-testid="feedback-view">
      <div className="feedback-header" data-testid="feedback-header">
        <h2>Session Feedback</h2>
        <div className="feedback-actions" data-testid="feedback-actions">
          <button className="btn-secondary" onClick={handleBackToChat} disabled={isExportingPDF} data-testid="back-to-chat-button">
            Back to Chat
          </button>
          <button className="btn-primary" onClick={handleNewSession} disabled={isExportingPDF} data-testid="new-session-button">
            New Session
          </button>
          <button 
            className="btn-export" 
            onClick={handleExportToPDF}
            disabled={!feedback || isExportingPDF}
            data-testid="export-pdf-button"
          >
            {isExportingPDF ? 'Exporting...' : 'Export to PDF'}
          </button>
        </div>
      </div>

      {pdfError && (
        <div className="pdf-error-notice" data-testid="pdf-error-notice">
          <span>⚠️ {pdfError}</span>
        </div>
      )}

      <div className="feedback-content" data-testid="feedback-content">
        {/* Scores Section */}
        <div className="feedback-section" data-testid="scores-section">
          <h3>Scores</h3>
          <div className="scores-grid" data-testid="scores-grid">
            <ScoreCard label="Grammar" value={feedback.grammar_score} />
            <ScoreCard label="Vocabulary" value={feedback.vocabulary_score} />
            <ScoreCard label="Fluency" value={feedback.fluency_score} />
            <ScoreCard label="Overall" value={feedback.overall_score} />
          </div>
        </div>

        {/* Strengths Section */}
        <div className="feedback-section" data-testid="strengths-section">
          <h3>Strengths</h3>
          {feedback.strengths.length > 0 ? (
            <ul className="strengths-list" data-testid="strengths-list">
              {feedback.strengths.map((strength, index) => (
                <li key={index} data-testid={`strength-${index}`}>{strength}</li>
              ))}
            </ul>
          ) : (
            <p data-testid="no-strengths">No specific strengths identified.</p>
          )}
        </div>

        {/* Focus Area Section */}
        <div className="feedback-section" data-testid="focus-area-section">
          <h3>Focus Area</h3>
          <div className="focus-area" data-testid="focus-area">
            <h4 data-testid="focus-area-priority">Priority: Improve your {feedback.focus_area}</h4>
          </div>
        </div>

        {/* Corrections Section */}
        {feedback.example_corrections && feedback.example_corrections.length > 0 && (
          <div className="feedback-section" data-testid="corrections-section">
            <h3>Example Corrections</h3>
            <div className="corrections-list" data-testid="corrections-list">
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
