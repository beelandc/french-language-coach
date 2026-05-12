import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessions } from '../hooks/useSessions'
import type { ChatInterfaceProps, Message } from '../types'

interface MessageBubbleProps {
  message: Message
}

function MessageBubble({ message }: MessageBubbleProps) {
  return (
    <div className={`message ${message.role}`}>
      <div className="role">{message.role === 'user' ? 'You' : 'AI'}</div>
      <div className="content">{message.content}</div>
    </div>
  )
}

interface ChatHeaderProps {
  scenarioName: string
  onBack: () => void
  onEndSession: () => void
  disabled: boolean
}

function ChatHeader({ scenarioName, onBack, onEndSession, disabled }: ChatHeaderProps) {
  return (
    <div className="chat-header">
      <button className="btn-secondary" onClick={onBack}>
        Back
      </button>
      <h2>{scenarioName}</h2>
      <button 
        className="btn-danger" 
        onClick={onEndSession}
        disabled={disabled}
      >
        End Session
      </button>
    </div>
  )
}

export default function ChatInterface({ sessionId }: ChatInterfaceProps) {
  const {
    currentScenarioId,
    sessionEnded,
    isLoading: isSessionsLoading,
    error: sessionsError,
    sendMessage,
    getFeedback,
    sessions,
  } = useSessions()
  
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
    if (!sessionId) return
    
    try {
      // getFeedback handles setting sessionEnded and caching feedback
      const feedback = await getFeedback(sessionId)
      console.log('Feedback received:', feedback)
      navigate(`/feedback/${sessionId}`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to end session'
      setError(errorMessage)
      console.error('Error ending session:', err)
    }
  }

  const handleBack = () => {
    navigate('/')
  }

  const scenarioName = getScenarioName()
  const isLoading = isSessionsLoading || isSending

  return (
    <div className="chat-container">
      <ChatHeader
        scenarioName={scenarioName}
        onBack={handleBack}
        onEndSession={handleEndSession}
        disabled={!sessionId || sessionEnded}
      />

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-state">
            <p>Start your conversation by typing a message below.</p>
          </div>
        ) : (
          messages.map(message => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="message-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type your message in French..."
          disabled={sessionEnded || isLoading}
        />
        <button type="submit" className="btn-primary" disabled={isLoading}>
          Send
        </button>
      </form>

      {error && <div className="error-message">{error}</div>}
      {sessionsError && <div className="error-message">{sessionsError}</div>}
    </div>
  )
}
