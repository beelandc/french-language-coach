/**
 * Tests for LessonViewer Component
 * 
 * Tests cover:
 * - Rendering of lesson metadata
 * - Section navigation (TOC)
 * - Markdown rendering (bold, italic, code, lists)
 * - Example highlighting
 * - Related lessons
 * - Edge cases
 * - Accessibility
 * - Responsive behavior
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import LessonViewer from './LessonViewer'
import type { Lesson, LessonSummary } from '../types/index'

// Mock lesson data
const mockLesson: Lesson = {
  id: 'test-lesson',
  title: 'Test Lesson',
  topic: 'Test Topic',
  difficulty: 'beginner',
  sections: [
    {
      title: 'Introduction',
      content: 'This is an **introduction** to the lesson.',
      examples: ['Example 1', 'Example 2'],
    },
    {
      title: 'Main Content',
      content: 'This is the *main* content.\n\nHere is a list:\n\n- Item 1\n- Item 2\n\nAnd a numbered list:\n\n1. First\n2. Second\n\nAnd some `code`.',
      examples: ['Another example'],
    },
    {
      title: 'Conclusion',
      content: 'This is the conclusion.',
      examples: [],
    },
  ],
}

const mockRelatedLessons: LessonSummary[] = [
  { id: 'lesson-1', title: 'Related Lesson 1', topic: 'Test Topic', difficulty: 'beginner' },
  { id: 'lesson-2', title: 'Related Lesson 2', topic: 'Test Topic', difficulty: 'intermediate' },
  { id: 'lesson-3', title: 'Related Lesson 3', topic: 'Other Topic', difficulty: 'beginner' },
]

// Helper function to render with router
const renderWithRouter = (lesson: Lesson, allLessons?: LessonSummary[], onBack?: () => void) => {
  return render(
    <MemoryRouter>
      <LessonViewer lesson={lesson} allLessons={allLessons} onBack={onBack} />
    </MemoryRouter>
  )
}

// Mock scrollIntoView
beforeEach(() => {
  window.scrollTo = vi.fn()
  
  // Mock scrollIntoView for section refs
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  vi.clearAllMocks()
})

/* ========================================================================
   Rendering Tests
   ======================================================================== */

describe('LessonViewer - Rendering', () => {
  it('renders without crashing', () => {
    renderWithRouter(mockLesson)
    expect(screen.getByTestId('lesson-viewer')).toBeInTheDocument()
  })

  it('renders lesson title', () => {
    renderWithRouter(mockLesson)
    expect(screen.getByText('Test Lesson')).toBeInTheDocument()
    expect(screen.getByTestId('lesson-viewer-title')).toBeInTheDocument()
  })

  it('renders lesson topic', () => {
    renderWithRouter(mockLesson)
    expect(screen.getByText('Test Topic')).toBeInTheDocument()
  })

  it('renders lesson difficulty with color', () => {
    renderWithRouter(mockLesson)
    expect(screen.getByText('Beginner')).toBeInTheDocument()
  })

  it('renders lesson ID', () => {
    renderWithRouter(mockLesson)
    expect(screen.getByText('test-lesson')).toBeInTheDocument()
  })

  it('renders section count', () => {
    renderWithRouter(mockLesson)
    expect(screen.getByText('3')).toBeInTheDocument() // 3 sections
  })

  it('renders reading time', () => {
    renderWithRouter(mockLesson)
    expect(screen.getByText(/min/)).toBeInTheDocument()
  })

  it('renders Browse All Lessons button', () => {
    renderWithRouter(mockLesson)
    expect(screen.getByTestId('lesson-viewer-browse')).toBeInTheDocument()
  })
})

/* ========================================================================
   Lesson Title and Metadata Tests (AC-1)
   ======================================================================== */

describe('LessonViewer - AC-1: Displays lesson title and metadata', () => {
  it('displays all metadata fields', () => {
    renderWithRouter(mockLesson)
    
    // Check title
    expect(screen.getByText('Test Lesson')).toBeInTheDocument()
    
    // Check topic
    expect(screen.getByText('Test Topic')).toBeInTheDocument()
    
    // Check difficulty
    expect(screen.getByText('Beginner')).toBeInTheDocument()
    
    // Check ID
    expect(screen.getByText('test-lesson')).toBeInTheDocument()
    
    // Check sections count
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('displays difficulty with correct color for beginner', () => {
    renderWithRouter(mockLesson)
    const difficultyEl = screen.getByText('Beginner')
    expect(difficultyEl).toHaveStyle({ color: '#4caf50' })
  })

  it('displays difficulty with correct color for intermediate', () => {
    const intermediateLesson: Lesson = {
      ...mockLesson,
      difficulty: 'intermediate',
    }
    renderWithRouter(intermediateLesson)
    const difficultyEl = screen.getByText('Intermediate')
    expect(difficultyEl).toHaveStyle({ color: '#ff9800' })
  })

  it('displays difficulty with correct color for advanced', () => {
    const advancedLesson: Lesson = {
      ...mockLesson,
      difficulty: 'advanced',
    }
    renderWithRouter(advancedLesson)
    const difficultyEl = screen.getByText('Advanced')
    expect(difficultyEl).toHaveStyle({ color: '#f44336' })
  })
})

/* ========================================================================
   Section Rendering Tests (AC-2)
   ======================================================================== */

describe('LessonViewer - AC-2: Renders all sections', () => {
  it('renders all section titles', () => {
    renderWithRouter(mockLesson)
    
    expect(screen.getByText('Section 1: Introduction')).toBeInTheDocument()
    expect(screen.getByText('Section 2: Main Content')).toBeInTheDocument()
    expect(screen.getByText('Section 3: Conclusion')).toBeInTheDocument()
  })

  it('renders section content', () => {
    renderWithRouter(mockLesson)
    
    expect(screen.getByText(/introduction to the lesson/i)).toBeInTheDocument()
    expect(screen.getByText(/main content/i)).toBeInTheDocument()
    expect(screen.getByText(/conclusion/i)).toBeInTheDocument()
  })

  it('renders sections with test IDs', () => {
    renderWithRouter(mockLesson)
    
    expect(screen.getByTestId('lesson-viewer-section-0')).toBeInTheDocument()
    expect(screen.getByTestId('lesson-viewer-section-1')).toBeInTheDocument()
    expect(screen.getByTestId('lesson-viewer-section-2')).toBeInTheDocument()
  })

  it('renders correct number of sections', () => {
    renderWithRouter(mockLesson)
    const sections = screen.getAllByTestId(/^lesson-viewer-section-/)
    expect(sections.length).toBe(3)
  })
})

/* ========================================================================
   Markdown Rendering Tests
   ======================================================================== */

describe('LessonViewer - Markdown Rendering', () => {
  it('renders bold markdown', () => {
    renderWithRouter(mockLesson)
    
    // Check that bold content is rendered
    expect(screen.getByText('introduction')).toBeInTheDocument()
    const boldEl = screen.getByText('introduction')
    expect(boldEl.tagName).toBe('STRONG')
  })

  it('renders italic markdown', () => {
    renderWithRouter(mockLesson)
    
    expect(screen.getByText('main')).toBeInTheDocument()
    const italicEl = screen.getByText('main')
    expect(italicEl.tagName).toBe('EM')
  })

  it('renders inline code markdown', () => {
    renderWithRouter(mockLesson)
    
    expect(screen.getByText('code')).toBeInTheDocument()
    const codeEl = screen.getByText('code')
    expect(codeEl.tagName).toBe('CODE')
  })

  it('renders unordered lists', () => {
    renderWithRouter(mockLesson)
    
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
    
    const list = screen.getByText('Item 1').parentElement
    expect(list?.tagName.toLowerCase()).toBe('li')
  })

  it('renders numbered lists', () => {
    renderWithRouter(mockLesson)
    
    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.getByText('Second')).toBeInTheDocument()
    
    // Check for ordered list
    const orderedList = screen.getByText('First').parentElement?.parentElement
    expect(orderedList?.tagName.toLowerCase()).toBe('ol')
  })

  it('renders paragraphs', () => {
    renderWithRouter(mockLesson)
    
    const paragraphs = screen.getAllByText(/content/i)
    expect(paragraphs.length).toBeGreaterThan(0)
    
    paragraphs.forEach(p => {
      expect(p.parentElement?.tagName.toLowerCase()).toBe('p')
    })
  })

  it('handles markdown with multiple inline formats', () => {
    const lesson: Lesson = {
      ...mockLesson,
      sections: [
        {
          title: 'Mixed Markdown',
          content: 'This has **bold**, *italic*, and `code` all together.',
          examples: [],
        },
      ],
    }
    renderWithRouter(lesson)
    
    expect(screen.getByText('bold')).toBeInTheDocument()
    expect(screen.getByText('bold').tagName).toBe('STRONG')
    
    expect(screen.getByText('italic')).toBeInTheDocument()
    expect(screen.getByText('italic').tagName).toBe('EM')
    
    expect(screen.getByText('code')).toBeInTheDocument()
    expect(screen.getByText('code').tagName).toBe('CODE')
  })
})

/* ========================================================================
   Example Display Tests (AC-3)
   ======================================================================== */

describe('LessonViewer - AC-3: Displays examples', () => {
  it('renders examples for sections that have them', () => {
    renderWithRouter(mockLesson)
    
    expect(screen.getByText('Example 1')).toBeInTheDocument()
    expect(screen.getByText('Example 2')).toBeInTheDocument()
    expect(screen.getByText('Another example')).toBeInTheDocument()
  })

  it('renders examples with highlighting styles', () => {
    renderWithRouter(mockLesson)
    
    const example1 = screen.getByText('Example 1')
    const exampleCard = example1.closest('.lesson-viewer-example')
    expect(exampleCard).toBeInTheDocument()
    expect(exampleCard).toHaveClass('lesson-viewer-example')
  })

  it('renders examples with test IDs', () => {
    renderWithRouter(mockLesson)
    
    expect(screen.getByTestId('lesson-viewer-example-0-0')).toBeInTheDocument()
    expect(screen.getByTestId('lesson-viewer-example-0-1')).toBeInTheDocument()
  })

  it('does not render examples section when section has no examples', () => {
    renderWithRouter(mockLesson)
    
    // Section 3 (Conclusion) has no examples, so it shouldn't have examples section
    const conclusionSection = screen.getByTestId('lesson-viewer-section-2')
    expect(conclusionSection).not.toContainHTML('Examples')
  })

  it('renders examples with proper structure', () => {
    renderWithRouter(mockLesson)
    
    const examplesTitle = screen.getByText('Examples')
    expect(examplesTitle).toBeInTheDocument()
    expect(examplesTitle.tagName).toBe('H3')
    expect(examplesTitle).toHaveClass('lesson-viewer-section-examples-title')
  })
})

/* ========================================================================
   Section Navigation Tests (AC-4)
   ======================================================================== */

describe('LessonViewer - AC-4: Navigation between sections', () => {
  it('renders TOC when there are multiple sections', () => {
    renderWithRouter(mockLesson)
    
    expect(screen.getByTestId('lesson-viewer-toc')).toBeInTheDocument()
    expect(screen.getByText('Contents')).toBeInTheDocument()
  })

  it('renders TOC links for all sections', () => {
    renderWithRouter(mockLesson)
    
    expect(screen.getByTestId('lesson-viewer-toc-link-0')).toBeInTheDocument()
    expect(screen.getByTestId('lesson-viewer-toc-link-1')).toBeInTheDocument()
    expect(screen.getByTestId('lesson-viewer-toc-link-2')).toBeInTheDocument()
  })

  it('TOC links display section titles', () => {
    renderWithRouter(mockLesson)
    
    expect(screen.getByText('Section 1')).toBeInTheDocument()
    expect(screen.getByText('Introduction')).toBeInTheDocument()
    expect(screen.getByText('Main Content')).toBeInTheDocument()
    expect(screen.getByText('Conclusion')).toBeInTheDocument()
  })

  it('TOC links are clickable and scroll to section', () => {
    renderWithRouter(mockLesson)
    
    const tocLink = screen.getByTestId('lesson-viewer-toc-link-0')
    fireEvent.click(tocLink)
    
    // Should call scrollIntoView on the section
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
  })

  it('does not render TOC when there is only one section', () => {
    const singleSectionLesson: Lesson = {
      ...mockLesson,
      sections: [mockLesson.sections[0]],
    }
    renderWithRouter(singleSectionLesson)
    
    expect(screen.queryByTestId('lesson-viewer-toc')).not.toBeInTheDocument()
  })

  it('renders section anchor links', () => {
    renderWithRouter(mockLesson)
    
    expect(screen.getByTestId('lesson-viewer-section-anchor-0')).toBeInTheDocument()
    expect(screen.getByTestId('lesson-viewer-section-anchor-1')).toBeInTheDocument()
  })

  it('section anchor links are hidden by default', () => {
    renderWithRouter(mockLesson)
    
    const anchor = screen.getByTestId('lesson-viewer-section-anchor-0')
    expect(anchor).toHaveStyle({ opacity: '0' })
  })
})

/* ========================================================================
   Related Lessons Tests (AC-5)
   ======================================================================== */

describe('LessonViewer - AC-5: Links to related lessons', () => {
  it('renders related lessons section when allLessons is provided', () => {
    renderWithRouter(mockLesson, mockRelatedLessons)
    
    expect(screen.getByTestId('lesson-viewer-related')).toBeInTheDocument()
    expect(screen.getByText('Related Lessons')).toBeInTheDocument()
  })

  it('renders related lesson cards', () => {
    renderWithRouter(mockLesson, mockRelatedLessons)
    
    // Should show top 3 related lessons (same topic gets higher score)
    expect(screen.getByText('Related Lesson 1')).toBeInTheDocument()
    expect(screen.getByText('Related Lesson 2')).toBeInTheDocument()
    expect(screen.getByText('Related Lesson 3')).toBeInTheDocument()
  })

  it('related lesson cards are links', () => {
    renderWithRouter(mockLesson, mockRelatedLessons)
    
    const relatedCard = screen.getByTestId('lesson-viewer-related-card-lesson-1')
    expect(relatedCard).toHaveAttribute('href', '/lessons/lesson-1')
  })

  it('related lesson cards display lesson info', () => {
    renderWithRouter(mockLesson, mockRelatedLessons)
    
    // Check that lesson info is displayed
    expect(screen.getByText('Related Lesson 1')).toBeInTheDocument()
    expect(screen.getByText('Test Topic')).toBeInTheDocument()
    expect(screen.getByText('Beginner')).toBeInTheDocument()
  })

  it('does not render related lessons when allLessons is empty', () => {
    renderWithRouter(mockLesson, [])
    
    expect(screen.queryByTestId('lesson-viewer-related')).not.toBeInTheDocument()
  })

  it('does not render related lessons when allLessons is not provided', () => {
    renderWithRouter(mockLesson, undefined)
    
    expect(screen.queryByTestId('lesson-viewer-related')).not.toBeInTheDocument()
  })

  it('filters out current lesson from related lessons', () => {
    const allLessonsIncludingCurrent: LessonSummary[] = [
      { id: 'test-lesson', title: 'Test Lesson', topic: 'Test Topic', difficulty: 'beginner' },
      ...mockRelatedLessons,
    ]
    renderWithRouter(mockLesson, allLessonsIncludingCurrent)
    
    // Current lesson should not appear in related lessons
    const relatedCards = screen.queryAllByTestId(/^lesson-viewer-related-card-/)
    expect(relatedCards.length).toBe(3) // Should only show 3 related, not 4
  })
})

/* ========================================================================
   Back Navigation Tests
   ======================================================================== */

describe('LessonViewer - Back Navigation', () => {
  it('renders back button when onBack is provided', () => {
    const onBack = vi.fn()
    renderWithRouter(mockLesson, [], onBack)
    
    expect(screen.getByTestId('lesson-viewer-back-btn')).toBeInTheDocument()
  })

  it('does not render back button when onBack is not provided', () => {
    renderWithRouter(mockLesson, [], undefined)
    
    expect(screen.queryByTestId('lesson-viewer-back-btn')).not.toBeInTheDocument()
  })

  it('calls onBack when back button is clicked', () => {
    const onBack = vi.fn()
    renderWithRouter(mockLesson, [], onBack)
    
    const backBtn = screen.getByTestId('lesson-viewer-back-btn')
    fireEvent.click(backBtn)
    
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})

/* ========================================================================
   Back to Top Button Tests
   ======================================================================== */

describe('LessonViewer - Back to Top Button', () => {
  it('renders back to top button', () => {
    renderWithRouter(mockLesson)
    
    expect(screen.getByTestId('lesson-viewer-top')).toBeInTheDocument()
    expect(screen.getByText('Back to Top')).toBeInTheDocument()
  })

  it('scrolls to top when back to top button is clicked', () => {
    renderWithRouter(mockLesson)
    
    const backToTopBtn = screen.getByTestId('lesson-viewer-top')
    fireEvent.click(backToTopBtn)
    
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })
})

/* ========================================================================
   Edge Cases Tests
   ======================================================================== */

describe('LessonViewer - Edge Cases', () => {
  it('handles lesson with empty sections array', () => {
    const emptyLesson: Lesson = {
      ...mockLesson,
      sections: [],
    }
    
    // Should not crash
    expect(() => renderWithRouter(emptyLesson)).not.toThrow()
  })

  it('handles section with empty title', () => {
    const lessonWithEmptyTitle: Lesson = {
      ...mockLesson,
      sections: [
        { title: '', content: 'Content without title', examples: [] },
      ],
    }
    
    renderWithRouter(lessonWithEmptyTitle)
    expect(screen.getByText(/Section 1/)).toBeInTheDocument()
  })

  it('handles section with empty content', () => {
    const lessonWithEmptyContent: Lesson = {
      ...mockLesson,
      sections: [
        { title: 'Empty Section', content: '', examples: [] },
      ],
    }
    
    renderWithRouter(lessonWithEmptyContent)
    expect(screen.getByText('Empty Section')).toBeInTheDocument()
  })

  it('handles section with empty examples array', () => {
    const lessonWithEmptyExamples: Lesson = {
      ...mockLesson,
      sections: [
        { title: 'No Examples', content: 'Some content', examples: [] },
      ],
    }
    
    renderWithRouter(lessonWithEmptyExamples)
    expect(screen.getByText('Some content')).toBeInTheDocument()
    // Should not render examples section
    expect(screen.queryByText('Examples')).not.toBeInTheDocument()
  })

  it('handles lesson with very long content', () => {
    const longContent = 'This is a very long content. '.repeat(100)
    const longLesson: Lesson = {
      ...mockLesson,
      sections: [
        { title: 'Long Content', content: longContent, examples: [] },
      ],
    }
    
    renderWithRouter(longLesson)
    expect(screen.getByText(/Long Content/)).toBeInTheDocument()
  })

  it('handles special characters in section titles', () => {
    const lessonWithSpecialChars: Lesson = {
      ...mockLesson,
      sections: [
        { title: 'Section with "quotes" & symbols!', content: 'Content', examples: [] },
      ],
    }
    
    renderWithRouter(lessonWithSpecialChars)
    expect(screen.getByText(/Section with/)).toBeInTheDocument()
  })

  it('handles lesson with no metadata', () => {
    const minimalLesson: Lesson = {
      id: '',
      title: '',
      topic: '',
      difficulty: 'beginner',
      sections: [
        { title: 'Section', content: 'Content', examples: [] },
      ],
    }
    
    renderWithRouter(minimalLesson)
    // Should render without crashing
    expect(screen.getByText('Section')).toBeInTheDocument()
  })
})

/* ========================================================================
   Accessibility Tests
   ======================================================================== */

describe('LessonViewer - Accessibility', () => {
  it('has proper aria-label on TOC', () => {
    renderWithRouter(mockLesson)
    
    const toc = screen.getByTestId('lesson-viewer-toc')
    expect(toc).toHaveAttribute('aria-label', 'Table of contents')
  })

  it('has proper aria-label on section anchor links', () => {
    renderWithRouter(mockLesson)
    
    const anchor = screen.getByTestId('lesson-viewer-section-anchor-0')
    expect(anchor).toHaveAttribute('aria-label', 'Link to this section')
  })

  it('has proper aria-label on back to top button', () => {
    renderWithRouter(mockLesson)
    
    const backToTop = screen.getByTestId('lesson-viewer-top')
    expect(backToTop).toHaveAttribute('aria-label', 'Scroll to top')
  })

  it('uses semantic HTML elements', () => {
    renderWithRouter(mockLesson)
    
    // Check for semantic elements
    expect(screen.getByRole('navigation')).toBeInTheDocument() // TOC
    expect(screen.getAllByRole('heading')).toHaveLength(5) // Title + 3 section titles + Examples
    expect(screen.getAllByRole('list')).toHaveLength(3) // 2 example lists + 1 TOC list
  })

  it('has proper heading hierarchy', () => {
    renderWithRouter(mockLesson)
    
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument() // Lesson title
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(3) // Section titles
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(2) // Examples titles
  })
})

/* ========================================================================
   Related Lessons Scoring Tests
   ======================================================================== */

describe('LessonViewer - Related Lessons Scoring', () => {
  it('prioritizes lessons with same topic', () => {
    const currentLesson: Lesson = {
      id: 'current',
      title: 'Current Lesson',
      topic: 'Verbs',
      difficulty: 'beginner',
      sections: [{ title: 'S1', content: 'C', examples: [] }],
    }
    
    const allLessons: LessonSummary[] = [
      { id: 'same-topic-beginner', title: 'Same Topic Beginner', topic: 'Verbs', difficulty: 'beginner' },
      { id: 'same-topic-intermediate', title: 'Same Topic Intermediate', topic: 'Verbs', difficulty: 'intermediate' },
      { id: 'different-topic-beginner', title: 'Different Topic Beginner', topic: 'Nouns', difficulty: 'beginner' },
      { id: 'different-topic-intermediate', title: 'Different Topic Intermediate', topic: 'Nouns', difficulty: 'intermediate' },
    ]
    
    renderWithRouter(currentLesson, allLessons)
    
    // Same topic lessons should appear first
    const relatedCards = screen.getAllByTestId(/^lesson-viewer-related-card-/)
    expect(relatedCards.length).toBeLessThanOrEqual(3)
  })

  it('prioritizes lessons with same difficulty', () => {
    const currentLesson: Lesson = {
      id: 'current',
      title: 'Current Lesson',
      topic: 'Verbs',
      difficulty: 'beginner',
      sections: [{ title: 'S1', content: 'C', examples: [] }],
    }
    
    const allLessons: LessonSummary[] = [
      { id: 'different-topic-beginner', title: 'Different Topic Beginner', topic: 'Nouns', difficulty: 'beginner' },
      { id: 'different-topic-intermediate', title: 'Different Topic Intermediate', topic: 'Nouns', difficulty: 'intermediate' },
    ]
    
    renderWithRouter(currentLesson, allLessons)
    
    // Should show beginner lesson first (same difficulty)
    expect(screen.getByText('Different Topic Beginner')).toBeInTheDocument()
  })

  it('limits related lessons to max 3', () => {
    const currentLesson: Lesson = {
      id: 'current',
      title: 'Current Lesson',
      topic: 'Verbs',
      difficulty: 'beginner',
      sections: [{ title: 'S1', content: 'C', examples: [] }],
    }
    
    const allLessons: LessonSummary[] = [
      { id: 'l1', title: 'L1', topic: 'Verbs', difficulty: 'beginner' },
      { id: 'l2', title: 'L2', topic: 'Verbs', difficulty: 'beginner' },
      { id: 'l3', title: 'L3', topic: 'Verbs', difficulty: 'beginner' },
      { id: 'l4', title: 'L4', topic: 'Verbs', difficulty: 'beginner' },
      { id: 'l5', title: 'L5', topic: 'Verbs', difficulty: 'beginner' },
    ]
    
    renderWithRouter(currentLesson, allLessons)
    
    const relatedCards = screen.getAllByTestId(/^lesson-viewer-related-card-/)
    expect(relatedCards.length).toBeLessThanOrEqual(3)
  })
})

/* ========================================================================
   Reading Time Calculation Tests
   ======================================================================== */

describe('LessonViewer - Reading Time Calculation', () => {
  it('calculates reading time based on word count', () => {
    const lessonWithKnownWords: Lesson = {
      id: 'test',
      title: 'Test',
      topic: 'Test',
      difficulty: 'beginner',
      sections: [
        {
          title: 'Section',
          content: 'one two three four five six seven eight nine ten', // 10 words
          examples: [],
        },
      ],
    }
    
    renderWithRouter(lessonWithKnownWords)
    
    // 10 words / 200 words per minute = 0.05 minutes, ceil to 1 minute
    expect(screen.getByText('1 min')).toBeInTheDocument()
  })

  it('calculates reading time for multiple sections', () => {
    const lessonWithMultipleSections: Lesson = {
      id: 'test',
      title: 'Test',
      topic: 'Test',
      difficulty: 'beginner',
      sections: [
        {
          title: 'S1',
          content: 'one two three four five', // 5 words
          examples: [],
        },
        {
          title: 'S2',
          content: 'six seven eight nine ten eleven twelve', // 6 words
          examples: [],
        },
      ],
    }
    
    renderWithRouter(lessonWithMultipleSections)
    
    // 11 words / 200 words per minute = 0.055 minutes, ceil to 1 minute
    expect(screen.getByText('1 min')).toBeInTheDocument()
  })

  it('never shows less than 1 minute', () => {
    const lessonWithFewWords: Lesson = {
      id: 'test',
      title: 'Test',
      topic: 'Test',
      difficulty: 'beginner',
      sections: [
        {
          title: 'S',
          content: 'one', // 1 word
          examples: [],
        },
      ],
    }
    
    renderWithRouter(lessonWithFewWords)
    
    expect(screen.getByText('1 min')).toBeInTheDocument()
  })
})
