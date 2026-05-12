import { useState, useEffect } from 'react'
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

  useEffect(() => {
    // Simulate loading - in future, fetch from API
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [])

  const handleScenarioClick = (scenarioId: string) => {
    // In future: call createSession and navigate to chat
    // For now, just log
    console.log('Selected scenario:', scenarioId)
  }

  if (isLoading) {
    return <div>Loading scenarios...</div>
  }

  return (
    <div className="scenarios-grid">
      {SCENARIOS.map(scenario => (
        <ScenarioCard
          key={scenario.id}
          scenario={scenario}
          onClick={() => handleScenarioClick(scenario.id)}
        />
      ))}
    </div>
  )
}
