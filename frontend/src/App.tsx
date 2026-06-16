import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import IndexPage from './pages/IndexPage'
import ScenarioPage from './pages/ScenarioPage'
import ChatPage from './pages/ChatPage'
import FeedbackPage from './pages/FeedbackPage'
import SessionDetailPage from './pages/SessionDetailPage'
import LessonPage from './pages/LessonPage'
import LessonDetailPage from './pages/LessonDetailPage'
import ReferencePage from './pages/ReferencePage'
import ExercisePage from './pages/ExercisePage'
import ExerciseBrowserPage from './pages/ExerciseBrowserPage'
import VocabularyPage from './pages/VocabularyPage'
import DeckDetailPage from './pages/DeckDetailPage'
import DeckCardsPage from './pages/DeckCardsPage'

function App() {
  return (
    <div className="app">
      <header>
        <h1>French Language Coach</h1>
      </header>
      
      <main>
        <Routes>
          {/* Modern landing page with central navigation hub (Issue #177) */}
          <Route path="/" element={<IndexPage />} />
          
          {/* Conversation Practice / Scenario Selection Route */}
          <Route path="/scenarios" element={<ScenarioPage />} />
          
          {/* Legacy HomePage kept for backward compatibility */}
          <Route path="/home" element={<HomePage />} />
          
          <Route path="/chat/:sessionId" element={<ChatPage />} />
          <Route path="/feedback/:sessionId" element={<FeedbackPage />} />
          <Route path="/sessions/:sessionId" element={<SessionDetailPage />} />
          {/* Grammar Lessons Routes (Phase 2) */}
          <Route path="/lessons" element={<LessonPage />} />
          <Route path="/lessons/:lessonId" element={<LessonDetailPage />} />
          {/* Grammar Reference Routes (Phase 2) */}
          <Route path="/reference" element={<ReferencePage />} />
          {/* Grammar Exercise Routes (Phase 2) */}
          <Route path="/exercises" element={<ExerciseBrowserPage />} />
          <Route path="/exercises/:exerciseId" element={<ExercisePage />} />
          {/* Vocabulary Routes (Issue #67) */}
          <Route path="/vocabulary" element={<VocabularyPage />} />
          {/* Vocabulary Deck Detail Routes (Issue #201) */}
          <Route path="/vocabulary/decks/:deckId" element={<DeckDetailPage />} />
          <Route path="/vocabulary/decks/:deckId/cards" element={<DeckCardsPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
