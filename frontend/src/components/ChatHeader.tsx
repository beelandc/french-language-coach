import type { ChatHeaderProps } from '@/types'

export default function ChatHeader({ scenarioName, onBack, onEndSession, disabled }: ChatHeaderProps) {
  return (
    <div className="chat-header" data-testid="chat-header">
      <button className="btn-secondary" onClick={onBack} data-testid="back-button">
        Back
      </button>
      <h2 data-testid="chat-scenario-name">{scenarioName}</h2>
      <button 
        className="btn-danger" 
        onClick={onEndSession}
        disabled={disabled}
        data-testid="end-session-button"
      >
        End Session
      </button>
    </div>
  )
}
