/**
 * VocabularyPage
 * 
 * Page component that exposes the DeckBrowser for browsing vocabulary decks.
 * Provides a dedicated page for users to manage and study their vocabulary.
 */

import DeckBrowser from '../components/DeckBrowser'

export default function VocabularyPage() {
  return (
    <div className="vocabulary-page" data-testid="vocabulary-page">
      <h1 className="vocabulary-page-title">Vocabulary Flashcards</h1>
      <p className="vocabulary-page-description">
        Browse, search, and study your vocabulary decks with spaced repetition.
      </p>

      <DeckBrowser />
    </div>
  )
}
