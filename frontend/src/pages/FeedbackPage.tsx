import { useParams } from 'react-router-dom'
import FeedbackView from '../components/FeedbackView'

export default function FeedbackPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  
  return (
    <div className="page-container" data-testid="feedback-page">
      <FeedbackView sessionId={sessionId || ''} />
    </div>
  )
}
