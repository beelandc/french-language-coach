/**
 * LessonViewer Component
 * 
 * Reusable component for rendering grammar lesson content with enhanced features.
 * Supports markdown rendering, section navigation (TOC), example highlighting,
 * and related lessons display.
 * 
 * This is a pure presentation component - it does not fetch data.
 * Data fetching should be handled by the parent component (e.g., LessonDetailPage).
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import type { Lesson, LessonSection, LessonSummary } from '../types/index'

/**
 * Props for LessonViewer component
 */
export interface LessonViewerProps {
  /** The lesson to display */
  lesson: Lesson
  /** Optional list of all lessons for related lessons feature */
  allLessons?: LessonSummary[]
  /** Optional callback for back navigation */
  onBack?: () => void
}

/**
 * Difficulty level colors for styling
 */
const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: '#4caf50',
  intermediate: '#ff9800',
  advanced: '#f44336',
}

/**
 * Generate a slug from a section title for use as anchor ID
 * 
 * @param title - Section title to slugify
 * @returns URL-safe slug string
 */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/--+/g, '-') // Replace multiple hyphens with single
    .trim()
}

/**
 * Find related lessons based on topic and difficulty
 * 
 * @param lesson - The current lesson
 * @param allLessons - All available lessons
 * @param maxCount - Maximum number of related lessons to return
 * @returns Array of related lesson summaries
 */
function findRelatedLessons(
  lesson: Lesson,
  allLessons: LessonSummary[] = [],
  maxCount: number = 3
): LessonSummary[] {
  if (allLessons.length === 0) return []

  // Filter out the current lesson and find matches by topic or difficulty
  const related = allLessons.filter((l) => l.id !== lesson.id)

  // Score lessons: same topic = 2 points, same difficulty = 1 point
  const scored = related.map((l) => ({
    lesson: l,
    score: (l.topic === lesson.topic ? 2 : 0) + (l.difficulty === lesson.difficulty ? 1 : 0),
  }))

  // Sort by score (descending) and take top N
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxCount)
    .map((item) => item.lesson)
}

/**
 * Get the difficulty display name with proper capitalization
 * 
 * @param difficulty - Difficulty level
 * @returns Capitalized difficulty name
 */
function getDifficultyDisplay(difficulty: string): string {
  return difficulty.charAt(0).toUpperCase() + difficulty.slice(1)
}

/**
 * LessonViewer component - renders a single lesson with enhanced features
 * 
 * @param props - Component props
 * @param props.lesson - The lesson to display
 * @param props.allLessons - Optional list of all lessons for related lessons feature
 * @param props.onBack - Optional callback for back navigation
 * @returns JSX Element
 */
export default function LessonViewer({ lesson, allLessons = [], onBack }: LessonViewerProps) {
  const [activeSection, setActiveSection] = useState<string>('')
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const tocRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)

  // Scroll to section when TOC item is clicked
  const scrollToSection = useCallback((sectionTitle: string) => {
    const slug = slugify(sectionTitle)
    const sectionRef = sectionRefs.current[slug]
    
    if (sectionRef) {
      sectionRef.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveSection(slug)
    }
  }, [])

  // Handle scroll to update active section in TOC
  useEffect(() => {
    const content = contentRef.current
    const sections = lesson.sections
    
    if (!content || sections.length === 0) return

    // Create a map of section slugs to their top positions
    const sectionPositions: Record<string, number> = {}
    sections.forEach((section) => {
      const slug = slugify(section.title || `section-${Math.random().toString(36).substr(2, 9)}`)
      const ref = sectionRefs.current[slug]
      if (ref) {
        sectionPositions[slug] = ref.getBoundingClientRect().top + window.scrollY
      }
    })

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100 // 100px offset for header
      
      // Find which section is currently in view
      let currentSection = ''
      for (const [slug, position] of Object.entries(sectionPositions)) {
        if (scrollPosition >= position) {
          currentSection = slug
        } else {
          break
        }
      }
      
      if (currentSection !== activeSection) {
        setActiveSection(currentSection)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    
    // Initial check
    handleScroll()
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [lesson.sections, activeSection])

  // Get related lessons
  const relatedLessons = findRelatedLessons(lesson, allLessons)



  // Calculate reading time (approximate)
  const getReadingTime = (): number => {
    const totalWords = lesson.sections.reduce(
      (acc, section) => acc + section.content.split(/\s+/).length,
      0
    )
    // Average reading speed: 200 words per minute
    return Math.max(1, Math.ceil(totalWords / 200))
  }

  // Render the component
  return (
    <div className="lesson-viewer" data-testid="lesson-viewer">
      {/* Header */}
      <div className="lesson-viewer-header">
        <div className="lesson-viewer-header-content">
          {onBack && (
            <button
              onClick={onBack}
              className="btn-secondary lesson-viewer-back-btn"
              aria-label="Back to all lessons"
              data-testid="lesson-viewer-back-btn"
            >
              ← Back
            </button>
          )}
          <div className="lesson-viewer-title-wrapper">
            <h1 className="lesson-viewer-title" data-testid="lesson-viewer-title">
              {lesson.title}
            </h1>
          </div>
        </div>
        
        <Link
          to="/lessons"
          className="btn-primary lesson-viewer-browse-btn"
          data-testid="lesson-viewer-browse"
        >
          Browse All Lessons
        </Link>
      </div>

      {/* Metadata */}
      <div className="lesson-viewer-meta" data-testid="lesson-viewer-meta">
        <div className="lesson-viewer-meta-left">
          <div className="lesson-viewer-meta-item">
            <span className="lesson-viewer-meta-label">Topic:</span>
            <span className="lesson-viewer-meta-value">{lesson.topic}</span>
          </div>
          <div className="lesson-viewer-meta-item">
            <span className="lesson-viewer-meta-label">Difficulty:</span>
            <span 
              className="lesson-viewer-meta-value" 
              style={{ color: DIFFICULTY_COLORS[lesson.difficulty] || '#666' }}
            >
              {getDifficultyDisplay(lesson.difficulty)}
            </span>
          </div>
          <div className="lesson-viewer-meta-item">
            <span className="lesson-viewer-meta-label">ID:</span>
            <span className="lesson-viewer-meta-value">{lesson.id}</span>
          </div>
        </div>
        
        <div className="lesson-viewer-meta-right">
          <div className="lesson-viewer-meta-item">
            <span className="lesson-viewer-meta-label">Sections:</span>
            <span className="lesson-viewer-meta-value">{lesson.sections.length}</span>
          </div>
          <div className="lesson-viewer-meta-item">
            <span className="lesson-viewer-meta-label">Reading Time:</span>
            <span className="lesson-viewer-meta-value">{getReadingTime()} min</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="lesson-viewer-main" ref={contentRef}>
        {/* Table of Contents - Desktop Sidebar */}
        {lesson.sections.length > 1 && (
          <nav 
            className="lesson-viewer-toc" 
            ref={tocRef}
            data-testid="lesson-viewer-toc"
            aria-label="Table of contents"
          >
            <h2 className="lesson-viewer-toc-title">Contents</h2>
            <ul className="lesson-viewer-toc-list">
              {lesson.sections.map((section, index) => {
                const slug = slugify(section.title || `section-${index}`)
                const isActive = activeSection === slug
                
                return (
                  <li key={slug} className="lesson-viewer-toc-item">
                    <a
                      href={`#${slug}`}
                      onClick={(e) => {
                        e.preventDefault()
                        scrollToSection(section.title || `section-${index}`)
                      }}
                      className={`lesson-viewer-toc-link ${isActive ? 'lesson-viewer-toc-link-active' : ''}`}
                      data-testid={`lesson-viewer-toc-link-${index}`}
                    >
                      <span className="lesson-viewer-toc-number">Section {index + 1}</span>
                      <span className="lesson-viewer-toc-text">{section.title}</span>
                    </a>
                  </li>
                )
              })}
            </ul>
          </nav>
        )}

        {/* Content */}
        <div className="lesson-viewer-content" data-testid="lesson-viewer-content">
          {lesson.sections.map((section: LessonSection, index: number) => {
            const slug = slugify(section.title || `section-${index}`)
            
            return (
              <section 
                key={section.title || index} 
                ref={(el) => { sectionRefs.current[slug] = el }}
                id={slug}
                className="lesson-viewer-section"
                data-testid={`lesson-viewer-section-${index}`}
              >
                {/* Section Header */}
                <div className="lesson-viewer-section-header">
                  <h2 className="lesson-viewer-section-title" data-testid={`lesson-viewer-section-title-${index}`}>
                    <span className="lesson-viewer-section-number">Section {index + 1}</span>
                    <span className="lesson-viewer-section-text">{section.title}</span>
                  </h2>
                  
                  {/* Section anchor link for direct access */}
                  <a 
                    href={`#${slug}`} 
                    className="lesson-viewer-section-anchor"
                    aria-label="Link to this section"
                    data-testid={`lesson-viewer-section-anchor-${index}`}
                  >
                    <span className="lesson-viewer-section-anchor-icon">🔗</span>
                  </a>
                </div>

                {/* Section Content with Markdown */}
                <div 
                  className="lesson-viewer-section-content"
                  data-testid={`lesson-viewer-section-content-${index}`}
                >
                  <ReactMarkdown
                    components={{
                      p: ({ node, ...props }) => (
                        <p {...props} className="lesson-markdown-paragraph" />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul {...props} className="lesson-markdown-list" />
                      ),
                      ol: ({ node, ...props }) => (
                        <ol {...props} className="lesson-markdown-list lesson-markdown-list-ordered" />
                      ),
                      li: ({ node, ...props }) => (
                        <li {...props} className="lesson-markdown-list-item" />
                      ),
                      strong: ({ node, ...props }) => (
                        <strong {...props} className="lesson-markdown-bold" />
                      ),
                      em: ({ node, ...props }) => (
                        <em {...props} className="lesson-markdown-italic" />
                      ),
                      code: ({ node, ...props }) => (
                        <code {...props} className="lesson-markdown-code" />
                      ),
                      h1: ({ node, ...props }) => (
                        <h1 {...props} className="lesson-markdown-heading-1" />
                      ),
                      h2: ({ node, ...props }) => (
                        <h2 {...props} className="lesson-markdown-heading-2" />
                      ),
                      h3: ({ node, ...props }) => (
                        <h3 {...props} className="lesson-markdown-heading-3" />
                      ),
                      h4: ({ node, ...props }) => (
                        <h4 {...props} className="lesson-markdown-heading-4" />
                      ),
                      h5: ({ node, ...props }) => (
                        <h5 {...props} className="lesson-markdown-heading-5" />
                      ),
                      h6: ({ node, ...props }) => (
                        <h6 {...props} className="lesson-markdown-heading-6" />
                      ),
                      blockquote: ({ node, ...props }) => (
                        <blockquote {...props} className="lesson-markdown-blockquote" />
                      ),
                      hr: ({ node, ...props }) => (
                        <hr {...props} className="lesson-markdown-hr" />
                      ),
                      a: ({ node, ...props }) => (
                        <a {...props} className="lesson-markdown-link" />
                      ),
                      img: ({ node, ...props }) => (
                        <img {...props} className="lesson-markdown-image" alt="" />
                      ),
                    }}
                  >
                    {section.content}
                  </ReactMarkdown>
                </div>

                {/* Examples with Highlighting */}
                {section.examples && section.examples.length > 0 && (
                  <div 
                    className="lesson-viewer-section-examples"
                    data-testid={`lesson-viewer-section-examples-${index}`}
                  >
                    <h3 className="lesson-viewer-section-examples-title">Examples</h3>
                    <ul className="lesson-viewer-examples-list">
                      {section.examples.map((example: string, exampleIndex: number) => (
                        <li 
                          key={exampleIndex} 
                          className="lesson-viewer-example"
                          data-testid={`lesson-viewer-example-${index}-${exampleIndex}`}
                        >
                          <span className="lesson-viewer-example-content">
                            {example}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )
          })}
        </div>
      </div>

      {/* Related Lessons */}
      {relatedLessons.length > 0 && (
        <section className="lesson-viewer-related" data-testid="lesson-viewer-related">
          <h2 className="lesson-viewer-related-title">Related Lessons</h2>
          <div className="lesson-viewer-related-grid">
            {relatedLessons.map((relatedLesson) => (
              <Link
                key={relatedLesson.id}
                to={`/lessons/${relatedLesson.id}`}
                className="lesson-viewer-related-card"
                data-testid={`lesson-viewer-related-card-${relatedLesson.id}`}
              >
                <div className="lesson-viewer-related-card-content">
                  <h3 className="lesson-viewer-related-card-title">
                    {relatedLesson.title}
                  </h3>
                  <p className="lesson-viewer-related-card-topic">
                    {relatedLesson.topic}
                  </p>
                  <span 
                    className="lesson-viewer-related-card-difficulty"
                    style={{
                      color: DIFFICULTY_COLORS[relatedLesson.difficulty] || '#666',
                    }}
                  >
                    {getDifficultyDisplay(relatedLesson.difficulty)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Back to top button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="btn-secondary lesson-viewer-top-btn"
        aria-label="Scroll to top"
        data-testid="lesson-viewer-top"
      >
        Back to Top
      </button>
    </div>
  )
}
