import { useParams } from 'react-router-dom'
import SessionDetail from '../components/SessionDetail'

/**
 * SessionDetailPage is a page-level component that extracts the sessionId
 * from route params and passes it to the SessionDetail component.
 */
export default function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>()

  return (
    <div className="page-container">
      <SessionDetail sessionId={sessionId || ''} />
    </div>
  )
}
