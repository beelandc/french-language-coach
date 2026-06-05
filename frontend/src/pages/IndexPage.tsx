import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { sessionApi } from '../utils/api'
import FeatureCard from '../components/FeatureCard'
import QuickAccessSession from '../components/QuickAccessSession'
import type { SessionSummary, SessionListResponse, FeatureConfig } from '../types'

/**
 * IndexPage serves as the modern landing page and central navigation hub for French Language Coach.
 * Replaces the original HomePage to showcase all application features.
 */
export default function IndexPage() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Feature card configurations
  const features: FeatureConfig[] = [
    {
      id: 'conversation',
      icon: '💬',
      title: 'Conversation Practice',
      description: 'Practice real French conversations with AI tutors',
      ctaText: 'Browse Scenarios →',
      path: '/scenarios' // Navigate to scenario selection page
    },
    {
      id: 'lessons',
      icon: '📚',
      title: 'Grammar Lessons',
      description: 'Interactive lessons covering French grammar topics',
      ctaText: 'Browse Lessons →',
      path: '/lessons'
    },
    {
      id: 'reference',
      icon: '📖',
      title: 'Grammar Reference',
      description: 'Searchable grammar database with explanations',
      ctaText: 'Search Reference →',
      path: '/reference'
    },
    {
      id: 'exercises',
      icon: '✏️',
      title: 'Grammar Exercises',
      description: 'Practice grammar with interactive exercises',
      ctaText: 'Practice Exercises →',
      path: '/exercises'
    },
    {
      id: 'vocabulary',
      icon: '📇',
      title: 'Vocabulary Flashcards',
      description: 'Spaced-repetition flashcards',
      ctaText: 'Learn Vocabulary →',
      disabled: true,
      comingSoon: true
    }
  ]

  // App description from VISION.md pitch
  const appDescription = "A comprehensive French language learning platform that combines immersive AI conversation practice with structured grammar lessons, spaced-repetition vocabulary training, and rich cultural context"

  // Fetch recent sessions on component mount
  useEffect(() => {
    const fetchRecentSessions = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const response: SessionListResponse = await sessionApi.listSessions(1, 5)
        
        // Transform backend response: id as number to string
        const transformedSessions = response.sessions.map(session => ({
          ...session,
          id: String(session.id),
          overall_score: session.overall_score !== null && session.overall_score !== undefined 
            ? session.overall_score 
            : null,
        }))
        
        setSessions(transformedSessions)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load recent sessions'
        setError(errorMessage)
        setSessions([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchRecentSessions()
  }, [])

  // Handle feature card navigation
  const handleFeatureClick = useCallback((path?: string) => {
    if (path) {
      navigate(path)
    }
  }, [navigate])

  // Handle session resume
  const handleSessionResume = useCallback((sessionId: string) => {
    navigate(`/sessions/${sessionId}`)
  }, [navigate])

  // Handle retry for session fetch
  const handleRetry = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response: SessionListResponse = await sessionApi.listSessions(1, 5)
      const transformedSessions = response.sessions.map(session => ({
        ...session,
        id: String(session.id),
        overall_score: session.overall_score !== null && session.overall_score !== undefined 
          ? session.overall_score 
          : null,
      }))
      
      setSessions(transformedSessions)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load recent sessions'
      setError(errorMessage)
      setSessions([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Handle "Get Started" button click - navigate to scenario selection
  const handleGetStarted = useCallback(() => {
    navigate('/scenarios')
  }, [navigate])

  return (
    <div className="index-page" data-testid="index-page">
      {/* Hero Section */}
      <section className="hero-section" data-testid="hero-section">
        <h1 className="hero-title">Welcome to French Language Coach</h1>
        <p className="hero-description">{appDescription}</p>
        <button 
          className="hero-cta btn-primary"
          onClick={handleGetStarted}
          aria-label="Get started with French Language Coach"
          data-testid="hero-cta"
        >
          Get Started
        </button>
      </section>

      {/* Feature Cards Grid */}
      <section className="feature-cards-section" data-testid="feature-cards-section">
        <div className="feature-cards-grid">
          {features.map((feature) => (
            <FeatureCard
              key={feature.id}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              ctaText={feature.ctaText}
              onClick={() => handleFeatureClick(feature.path)}
              disabled={feature.disabled}
              comingSoon={feature.comingSoon}
              data-testid={`feature-card-${feature.id}`}
            />
          ))}
        </div>
      </section>

      {/* Quick Access Section */}
      <section className="quick-access-section" data-testid="quick-access-section">
        <div className="quick-access-header">
          <h2 className="quick-access-title">Recent Sessions</h2>
          <button 
            className="view-all-link btn-secondary"
            onClick={() => navigate('/sessions')}
            aria-label="View all sessions"
            data-testid="view-all-sessions-btn"
          >
            View All Sessions
          </button>
        </div>

        {isLoading ? (
          <div className="loading-state" data-testid="quick-access-loading">
            <p>Loading recent sessions...</p>
            <div className="spinner spinner-small" />
          </div>
        ) : error ? (
          <div className="error-state" data-testid="quick-access-error">
            <p className="error-message">{error}</p>
            <button 
              className="btn-primary"
              onClick={handleRetry}
              aria-label="Retry loading sessions"
              data-testid="quick-access-retry-btn"
            >
              Retry
            </button>
          </div>
        ) : sessions.length === 0 ? (
          <div className="empty-state" data-testid="quick-access-empty">
            <p>No recent sessions. Start a new one!</p>
            <button 
              className="btn-primary"
              onClick={() => navigate('/scenarios')}
              aria-label="Start a new session"
              data-testid="quick-access-start-btn"
            >
              Start Now
            </button>
          </div>
        ) : (
          <div className="quick-access-list" data-testid="quick-access-list">
            {sessions.map((session) => (
              <QuickAccessSession
                key={session.id}
                session={session}
                onClick={handleSessionResume}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
