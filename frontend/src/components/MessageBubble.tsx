import type { MessageBubbleProps } from '@/types'

export default function MessageBubble({ message }: MessageBubbleProps) {
  return (
    <div className={`message ${message.role}`} data-testid={`message-${message.id}`}>
      <div className="role">{message.role === 'user' ? 'You' : 'AI'}</div>
      <div className="content">{message.content}</div>
    </div>
  )
}
