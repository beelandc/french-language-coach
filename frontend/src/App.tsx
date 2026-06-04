import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ChatPage from './pages/ChatPage'
import FeedbackPage from './pages/FeedbackPage'
import SessionDetailPage from './pages/SessionDetailPage'

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
        </Routes>
      </main>
    </div>
  )
}

export default App
