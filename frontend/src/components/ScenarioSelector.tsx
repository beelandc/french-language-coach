import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessions } from '../hooks/useSessions'
import type { Scenario } from '../types'

// Hardcoded scenarios matching backend - will fetch from API in future
const SCENARIOS: Scenario[] = [
  { id: 'cafe_order', name: 'Ordering at a Café', description: 'Practice ordering coffee, pastries, and asking about menu items in a Parisian café.' },
  { id: 'ask_directions', name: 'Asking for Directions', description: 'Practice asking for and understanding directions to landmarks around Paris.' },
  { id: 'job_interview', name: 'Job Interview', description: 'Simulate a job interview in French for a position as a software engineer.' },
  { id: 'hotel_checkin', name: 'Hotel Check-in', description: 'Practice checking into a hotel, asking about amenities, and reporting issues.' },
  { id: 'shopping', name: 'Shopping for Clothes', description: 'Practice shopping for clothes, asking about sizes, prices, and trying items on.' },
  { id: 'doctor_visit', name: 'Doctor\'s Visit', description: 'Practice describing symptoms and understanding medical advice in French.' },
  { id: 'train_travel', name: 'Train Travel', description: 'Practice buying train tickets and asking about schedules at a French train station.' },
  { id: 'restaurant_dining', name: 'Dining at a Restaurant', description: 'Practice ordering a full meal, asking about specials, and interacting with the waiter.' },
  { id: 'apartment_rental', name: 'Apartment Rental', description: 'Practice negotiating and asking about details for renting an apartment in France.' },
  { id: 'museum_visit', name: 'Museum Visit', description: 'Practice asking about exhibits, tickets, and audio guides at a French museum.' },
]

interface ScenarioCardProps {
  scenario: Scenario
  onClick: () => void
}

function ScenarioCard({ scenario, onClick }: ScenarioCardProps) {
  return (
    <div className="scenario-card" onClick={onClick}>
      <h3>{scenario.name}</h3>
      <p>{scenario.description}</p>
    </div>
  )
}

export default function ScenarioSelector() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { createSession, isLoading: isCreating } = useSessions()
  const navigate = useNavigate()

  useEffect(() => {
    // Simulate loading - in future, fetch from API
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [])

  const handleScenarioClick = async (scenarioId: string) => {
    if (isCreating) return
    
    setError(null)
    
    try {
      const sessionId = await createSession(scenarioId)
      // Navigate to chat page with the new session ID
      navigate(`/chat/${sessionId}`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start session'
      setError(errorMessage)
      console.error('Error creating session:', err)
    }
  }

  if (isLoading) {
    return <div>Loading scenarios...</div>
  }

  return (
    <>
      {error && <div className="error-message">{error}</div>}
      <div className="scenarios-grid">
        {SCENARIOS.map(scenario => (
          <ScenarioCard
            key={scenario.id}
            scenario={scenario}
            onClick={() => handleScenarioClick(scenario.id)}
          />
        ))}
      </div>
    </>
  )
}
