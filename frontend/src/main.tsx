import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { SessionsProvider } from './hooks/useSessions'
import './styles/global.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SessionsProvider>
        <App />
      </SessionsProvider>
    </BrowserRouter>
  </StrictMode>,
)
