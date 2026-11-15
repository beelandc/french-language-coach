import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessions } from '../hooks/useSessions'
import type { ChatInterfaceProps } from '../types'
import ChatHeader from './ChatHeader'
import MessageBubble from './MessageBubble'

export default function ChatInterface({ sessionId }: ChatInterfaceProps) {
  const {
    currentScenarioId,
    sessionEnded,
    isLoading: isSessionsLoading,
    error: sessionsError,
    sendMessage,
    getFeedback,
    clearError,
    sessions,
    lockSession,
    unlockSession,
  } = useSessions()
  
  // Generate a unique client ID for this session/tab
  const clientId = useRef<string>(`chat_${sessionId}_${Date.now()}`).current
  
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Feedback generation failure (e.g. 502 after the backend's retry), shown with a retry button (Issue #229)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const [isRequestingFeedback, setIsRequestingFeedback] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Get the current session's messages
  const session = sessions.find(s => s.id === sessionId)
  const messages = session?.messages || []

  // Get scenario name from session ID
  const getScenarioName = useCallback((): string => {
    if (!sessionId) return 'Chat Session'
    
    // Map scenario IDs to names
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
    
    // Use session's scenario_id if available
    if (session?.scenario_id) {
      return scenarioNames[session.scenario_id] || session.scenario_id
    }
    
    // Fallback to currentScenarioId from hook
    if (currentScenarioId && scenarioNames[currentScenarioId]) {
      return scenarioNames[currentScenarioId]
    }
    
    return 'Chat Session'
  }, [sessionId, session, currentScenarioId])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Lock session on mount, unlock on unmount
  useEffect(() => {
    const lockAndUnlock = async () => {
      if (sessionId) {
        try {
          // Lock the session when ChatInterface is mounted
          await lockSession(sessionId, clientId)
        } catch (err) {
          // Silently handle lock errors (session might already be locked by another tab)
          console.warn('Failed to lock session:', err)
        }
      }
    }
    
    lockAndUnlock()
    
    return () => {
      // Unlock the session when ChatInterface is unmounted
      const unlock = async () => {
        if (sessionId) {
          try {
            await unlockSession(sessionId, clientId)
          } catch (err) {
            // Silently handle unlock errors
            console.warn('Failed to unlock session:', err)
          }
        }
      }
      unlock()
    }
  }, [sessionId, lockSession, unlockSession, clientId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!inputValue.trim() || !sessionId) return
    
    setIsSending(true)
    setError(null)
    
    try {
      setInputValue('')
      // Send message to API - hook will update sessions state
      await sendMessage(sessionId, inputValue)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
      setError(errorMessage)
      console.error('Error sending message:', err)
    } finally {
      setIsSending(false)
    }
  }

  const handleEndSession = async () => {
    if (!sessionId || isRequestingFeedback) return

    setFeedbackError(null)
    setIsRequestingFeedback(true)
    try {
      // getFeedback handles setting sessionEnded and caching feedback
      await getFeedback(sessionId)
      navigate(`/feedback/${sessionId}`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate feedback'
      setFeedbackError(errorMessage)
      // The hook stores the same message; clear it so it isn't shown twice
      clearError()
      console.error('Error ending session:', err)
    } finally {
      setIsRequestingFeedback(false)
    }
  }

  const handleBack = () => {
    // Navigate to scenarios page (moved from / to /scenarios in issue #177)
    navigate('/scenarios')
  }

  const scenarioName = getScenarioName()
  const isLoading = isSessionsLoading || isSending || isRequestingFeedback

  return (
    <div className="chat-container" data-testid="chat-interface">
      <ChatHeader
        scenarioName={scenarioName}
        onBack={handleBack}
        onEndSession={handleEndSession}
        disabled={!sessionId || sessionEnded || isLoading}
      />

      <div className="chat-messages" data-testid="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-state" data-testid="empty-chat-state">
            <p>Start your conversation by typing a message below.</p>
          </div>
        ) : (
          messages.map(message => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
        {isLoading && (
          <div className="loading-spinner" role="status" aria-live="polite" aria-label="Loading AI response..." data-testid="loading-spinner">
            <div className="spinner" />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="message-form" onSubmit={handleSubmit} data-testid="message-form">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type your message in French..."
          disabled={sessionEnded || isLoading}
          data-testid="message-input"
        />
        <button type="submit" className="btn-primary" disabled={isLoading} data-testid="send-button">
          Send
        </button>
      </form>

      {feedbackError && (
        <div className="error-message feedback-error" role="alert" data-testid="feedback-error">
          <span>{feedbackError}</span>
          <button
            type="button"
            className="btn-primary"
            onClick={handleEndSession}
            disabled={isLoading}
            data-testid="retry-feedback-button"
          >
            Retry feedback
          </button>
        </div>
      )}
      {error && <div className="error-message" data-testid="chat-error">{error}</div>}
      {sessionsError && <div className="error-message" data-testid="sessions-error">{sessionsError}</div>}
    </div>
  )
}
