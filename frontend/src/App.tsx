import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ChatPage from './pages/ChatPage'
import FeedbackPage from './pages/FeedbackPage'
import SessionDetailPage from './pages/SessionDetailPage'
import LessonPage from './pages/LessonPage'
import LessonDetailPage from './pages/LessonDetailPage'
import ReferencePage from './pages/ReferencePage'
import ExercisePage from './pages/ExercisePage'
import ExerciseBrowserPage from './pages/ExerciseBrowserPage'

function App() {
  return (
    <div className="app">
      <header>
        <h1>French Language Coach</h1>
      </header>
      
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
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
        </Routes>
      </main>
    </div>
  )
}

export default App
