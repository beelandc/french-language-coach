/**
 * LessonPage Component
 * 
 * Page-level component for displaying the LessonBrowser.
 * Provides a container for the lesson browser.
 */

import LessonBrowser from '../components/LessonBrowser'

/**
 * LessonPage component - container for LessonBrowser
 * 
 * Displays the lesson browser.
 * 
 * @returns JSX Element
 */
export default function LessonPage() {
  return (
    <div className="page-container" data-testid="lesson-page">
      <LessonBrowser />
    </div>
  )
}
