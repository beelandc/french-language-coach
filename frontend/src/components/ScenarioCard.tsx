import type { ScenarioCardProps } from '@/types'

export default function ScenarioCard({ scenario, onClick }: ScenarioCardProps) {
  return (
    <div className="scenario-card" onClick={onClick}>
      <h3>{scenario.name}</h3>
      <p>{scenario.description}</p>
    </div>
  )
}
