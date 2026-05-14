import type { MessageBubbleProps } from '@/types'

export default function MessageBubble({ message }: MessageBubbleProps) {
  return (
    <div className={`message ${message.role}`}>
      <div className="role">{message.role === 'user' ? 'You' : 'AI'}</div>
      <div className="content">{message.content}</div>
    </div>
  )
}
