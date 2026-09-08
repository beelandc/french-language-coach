import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import FeatureCard from '../components/FeatureCard'
import type { FeatureConfig } from '../types'

/**
 * IndexPage serves as the modern landing page and central navigation hub for French Language Coach.
 * Replaces the original HomePage to showcase all application features.
 */
export default function IndexPage() {
  const navigate = useNavigate()

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
      path: '/vocabulary'
    }
  ]

  // App description from VISION.md pitch
  const appDescription = "A comprehensive French language learning platform that combines immersive AI conversation practice with structured grammar lessons, spaced-repetition vocabulary training, and rich cultural context"

  // Handle feature card navigation
  const handleFeatureClick = useCallback((path?: string) => {
    if (path) {
      navigate(path)
    }
  }, [navigate])

  return (
    <div className="index-page" data-testid="index-page">
      {/* Hero Section */}
      <section className="hero-section" data-testid="hero-section">
        <h1 className="hero-title">Welcome to French Language Coach</h1>
        <p className="hero-description">{appDescription}</p>
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
    </div>
  )
}
