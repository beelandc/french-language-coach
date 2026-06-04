/**
 * LessonPage Component
 * 
 * Page-level component for displaying the LessonBrowser.
 * Handles routing and provides a container for the lesson browser.
 */

import { useParams, useNavigate } from 'react-router-dom'
import LessonBrowser from '../components/LessonBrowser'

/**
 * LessonPage component - container for LessonBrowser
 * 
 * Displays the lesson browser with optional initial filters from URL params.
 * 
 * @returns JSX Element
 */
export default function LessonPage() {
  // Get URL parameters for initial filters (if any)
  const params = useParams()
  const navigate = useNavigate()

  // Extract initial filters from URL if present
  // Note: Currently not implemented in URL, but available for future use
  // const { difficulty, topic, search } = params

  return (
    <div className="page-container" data-testid="lesson-page">
      <LessonBrowser
        // initialDifficulty={difficulty as Difficulty || undefined}
        // initialTopic={topic || undefined}
        // initialSearch={search || undefined}
      />
    </div>
  )
}
