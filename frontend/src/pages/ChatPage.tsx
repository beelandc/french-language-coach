import { useParams } from 'react-router-dom'
import ChatInterface from '../components/ChatInterface'

export default function ChatPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  
  return (
    <div className="page-container">
      <ChatInterface sessionId={sessionId || ''} />
    </div>
  )
}
