import { useNavigate } from 'react-router-dom'
import ScenarioSelector from '../components/ScenarioSelector'
import SessionHistory from '../components/SessionHistory'

export default function HomePage() {
  const navigate = useNavigate()

  const handleSessionClick = (sessionId: string) => {
    navigate(`/sessions/${sessionId}`)
  }

  return (
    <div className="page-container">
      <h2>Select a Conversation Scenario</h2>
      <ScenarioSelector />
      
      <hr className="section-divider" />
      
      <SessionHistory onSessionClick={handleSessionClick} />
    </div>
  )
}
