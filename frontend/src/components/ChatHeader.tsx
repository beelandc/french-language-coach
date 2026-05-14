import type { ChatHeaderProps } from '@/types'

export default function ChatHeader({ scenarioName, onBack, onEndSession, disabled }: ChatHeaderProps) {
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
