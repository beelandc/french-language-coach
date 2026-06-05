import ScenarioSelector from '../components/ScenarioSelector'

/**
 * ScenarioPage displays the scenario selection interface.
 * This page is dedicated to conversation practice scenario selection.
 */
export default function ScenarioPage() {
  return (
    <div className="page-container" data-testid="scenario-page">
      <h2>Select a Conversation Scenario</h2>
      <ScenarioSelector />
    </div>
  )
}
