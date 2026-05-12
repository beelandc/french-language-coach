import { useState, useEffect, useRef } from 'react'
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

export default function ChatInterface({ sessionId }: ChatInterfaceProps) {
  const {
    sessionEnded,
    isLoading,
    error,
    sendMessage,
    getFeedback,
    endSession,
  } = useSessions()
  
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Load existing messages for this session
  useEffect(() => {
    // In future: fetch session details from API
    // For now, just set the session ID
    // This would be replaced with actual API call
    console.log('Loading session:', sessionId)
  }, [sessionId])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!inputValue.trim() || !sessionId) return
    
    try {
      const message = await sendMessage(sessionId, inputValue)
      setMessages(prev => [...prev, 
        { id: Date.now().toString(), session_id: sessionId, role: 'user', content: inputValue, created_at: new Date().toISOString() },
        message
      ])
      setInputValue('')
    } catch (err) {
      console.error('Failed to send message:', err)
    }
  }

  const handleEndSession = async () => {
    if (!sessionId) return
    
    try {
      endSession()
      const feedback = await getFeedback(sessionId)
      console.log('Feedback:', feedback)
      // In future: navigate to feedback page
      navigate(`/feedback/${sessionId}`)
    } catch (err) {
      console.error('Failed to end session:', err)
    }
  }

  const handleBack = () => {
    navigate('/')
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <button className="btn-secondary" onClick={handleBack}>
          Back
        </button>
        <h2>Chat Session</h2>
        <button 
          className="btn-danger" 
          onClick={handleEndSession}
          disabled={!sessionId}
        >
          End Session
        </button>
      </div>

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
    </div>
  )
}
