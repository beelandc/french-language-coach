/**
 * Tests for LessonDetailPage component
 * 
 * Tests cover:
 * - Loading state
 * - Error state
 * - Not found state
 * - Lesson display
 * - Navigation
 * - Edge cases
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import LessonDetailPage from './LessonDetailPage'
import { grammarApi } from '../utils/api'
import type { Lesson } from '../types/index'

// Mock lesson data
const mockLesson: Lesson = {
  id: 'verb-conjugation',
  title: 'Verb Conjugation',
  topic: 'Verbs',
  difficulty: 'beginner',
  sections: [
    {
      title: 'Present Tense',
      content: 'This is the present tense content.',
      examples: ['Je parle', 'Tu parles', 'Il/Elle parle'],
    },
    {
      title: 'Past Tense',
      content: 'This is the past tense content.',
      examples: ['J\'ai parlé', 'Tu as parlé'],
    },
  ],
}

// Mock the API
vi.mock('../utils/api', () => ({
  grammarApi: {
    getLesson: vi.fn(),
  },
}))

describe('LessonDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(grammarApi.getLesson as jest.Mock).mockResolvedValue(mockLesson)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // Helper function to render with route
  const renderWithRoute = (lessonId: string) => {
    return render(
      <MemoryRouter initialEntries={[`/lessons/${lessonId}`]}>
        <Routes>
          <Route path="/lessons/:lessonId" element={<LessonDetailPage />} />
        </Routes>
      </MemoryRouter>
    )
  }

  describe('Rendering', () => {
    it('renders page container', async () => {
      renderWithRoute('verb-conjugation')

      await waitFor(() => {
        expect(screen.getByTestId('lesson-detail-page')).toBeInTheDocument()
      })
    })
  })

  describe('Loading State', () => {
    it('displays loading state initially', () => {
      // Override to make it pending
      ;(grammarApi.getLesson as jest.Mock).mockImplementation(
        () => new Promise(() => {})
      )

      renderWithRoute('verb-conjugation')

      expect(screen.getByTestId('lesson-detail-loading')).toBeInTheDocument()
      expect(screen.getByText('Loading lesson...')).toBeInTheDocument()
    })
  })

  describe('Lesson Display', () => {
    it('displays lesson title', async () => {
      renderWithRoute('verb-conjugation')

      await waitFor(() => {
        expect(screen.getByTestId('lesson-detail-title')).toBeInTheDocument()
        expect(screen.getByText('Verb Conjugation')).toBeInTheDocument()
      })
    })

    it('displays lesson metadata', async () => {
      renderWithRoute('verb-conjugation')

      await waitFor(() => {
        expect(screen.getByTestId('lesson-detail-meta')).toBeInTheDocument()
        expect(screen.getByText(/Topic: Verbs/i)).toBeInTheDocument()
        expect(screen.getByText(/Difficulty: Beginner/i)).toBeInTheDocument()
        expect(screen.getByText(/ID: verb-conjugation/i)).toBeInTheDocument()
        expect(screen.getByText(/Sections: 2/i)).toBeInTheDocument()
      })
    })

    it('displays lesson sections', async () => {
      renderWithRoute('verb-conjugation')

      await waitFor(() => {
        expect(screen.getByTestId('lesson-detail-content')).toBeInTheDocument()
        expect(screen.getByText(/Section 1: Present Tense/i)).toBeInTheDocument()
        expect(screen.getByText(/Section 2: Past Tense/i)).toBeInTheDocument()
      })
    })

    it('displays section content', async () => {
      renderWithRoute('verb-conjugation')

      await waitFor(() => {
        expect(screen.getByText(/This is the present tense content./i)).toBeInTheDocument()
        expect(screen.getByText(/This is the past tense content./i)).toBeInTheDocument()
      })
    })

    it('displays section examples', async () => {
      renderWithRoute('verb-conjugation')

      await waitFor(() => {
        expect(screen.getByText('Je parle')).toBeInTheDocument()
        expect(screen.getByText('Tu parles')).toBeInTheDocument()
        expect(screen.getByText("J'ai parlé")).toBeInTheDocument()
      })
    })

    it('displays back button', async () => {
      renderWithRoute('verb-conjugation')

      await waitFor(() => {
        expect(screen.getByTestId('lesson-detail-back-btn')).toBeInTheDocument()
      })
    })

    it('displays browse all lessons button', async () => {
      renderWithRoute('verb-conjugation')

      await waitFor(() => {
        expect(screen.getByTestId('lesson-detail-browse')).toBeInTheDocument()
        expect(screen.getByText('Browse All Lessons')).toBeInTheDocument()
      })
    })

    it('displays back to top button', async () => {
      renderWithRoute('verb-conjugation')

      await waitFor(() => {
        expect(screen.getByTestId('lesson-detail-top')).toBeInTheDocument()
      })
    })
  })

  describe('Navigation', () => {
    it('navigates back when back button is clicked', async () => {
      const mockNavigate = vi.fn()
      vi.spyOn(require('react-router-dom'), 'useNavigate').mockReturnValue(mockNavigate)

      renderWithRoute('verb-conjugation')

      await waitFor(() => {
        expect(screen.getByTestId('lesson-detail-back-btn')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('lesson-detail-back-btn'))

      expect(mockNavigate).toHaveBeenCalledWith('/lessons')
    })
  })

  describe('Error State', () => {
    it('displays error message when API fails', async () => {
      const errorMessage = 'Failed to load lesson'
      ;(grammarApi.getLesson as jest.Mock).mockRejectedValue(new Error(errorMessage))

      renderWithRoute('verb-conjugation')

      await waitFor(() => {
        expect(screen.getByTestId('lesson-detail-error')).toBeInTheDocument()
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })
    })

    it('displays retry button on error', async () => {
      ;(grammarApi.getLesson as jest.Mock).mockRejectedValue(new Error('API Error'))

      renderWithRoute('verb-conjugation')

      await waitFor(() => {
        expect(screen.getByTestId('lesson-detail-retry')).toBeInTheDocument()
      })
    })

    it('displays back to lessons button on error', async () => {
      ;(grammarApi.getLesson as jest.Mock).mockRejectedValue(new Error('API Error'))

      renderWithRoute('verb-conjugation')

      await waitFor(() => {
        expect(screen.getByTestId('lesson-detail-back')).toBeInTheDocument()
      })
    })
  })

  describe('Not Found State', () => {
    it('displays not found message when lesson is null', async () => {
      ;(grammarApi.getLesson as jest.Mock).mockResolvedValue(null as unknown as Lesson)

      renderWithRoute('verb-conjugation')

      await waitFor(() => {
        expect(screen.getByTestId('lesson-detail-not-found')).toBeInTheDocument()
        expect(screen.getByText('Lesson not found.')).toBeInTheDocument()
      })
    })

    it('displays back button on not found', async () => {
      ;(grammarApi.getLesson as jest.Mock).mockResolvedValue(null as unknown as Lesson)

      renderWithRoute('verb-conjugation')

      await waitFor(() => {
        expect(screen.getByTestId('lesson-detail-back-button')).toBeInTheDocument()
      })
    })
  })

  describe('Missing Lesson ID', () => {
    it('displays error when lesson ID is missing', async () => {
      render(
        <MemoryRouter initialEntries={['/lessons/']}>
          <Routes>
            <Route path="/lessons/:lessonId" element={<LessonDetailPage />} />
          </Routes>
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('lesson-detail-error')).toBeInTheDocument()
        expect(screen.getByText(/Lesson ID is required/i)).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper heading structure', async () => {
      renderWithRoute('verb-conjugation')

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Verb Conjugation' })).toBeInTheDocument()
      })
    })

    it('has accessible back button', async () => {
      renderWithRoute('verb-conjugation')

      await waitFor(() => {
        expect(screen.getByLabelText('Back to all lessons')).toBeInTheDocument()
      })
    })

    it('has accessible scroll to top button', async () => {
      renderWithRoute('verb-conjugation')

      await waitFor(() => {
        expect(screen.getByLabelText('Scroll to top')).toBeInTheDocument()
      })
    })
  })

  describe('Difficulty Colors', () => {
    it('displays beginner with green color', async () => {
      renderWithRoute('verb-conjugation')

      await waitFor(() => {
        const difficultyValue = screen.getByText('Beginner')
        expect(difficultyValue).toHaveStyle({ color: '#4caf50' })
      })
    })

    it('displays intermediate with orange color', async () => {
      const intermediateLesson: Lesson = {
        ...mockLesson,
        difficulty: 'intermediate',
        id: 'intermediate-lesson',
      }
      ;(grammarApi.getLesson as jest.Mock).mockResolvedValue(intermediateLesson)

      renderWithRoute('intermediate-lesson')

      await waitFor(() => {
        const difficultyValue = screen.getByText('Intermediate')
        expect(difficultyValue).toHaveStyle({ color: '#ff9800' })
      })
    })

    it('displays advanced with red color', async () => {
      const advancedLesson: Lesson = {
        ...mockLesson,
        difficulty: 'advanced',
        id: 'advanced-lesson',
      }
      ;(grammarApi.getLesson as jest.Mock).mockResolvedValue(advancedLesson)

      renderWithRoute('advanced-lesson')

      await waitFor(() => {
        const difficultyValue = screen.getByText('Advanced')
        expect(difficultyValue).toHaveStyle({ color: '#f44336' })
      })
    })
  })

  describe('Content Formatting', () => {
    it('renders newlines as line breaks', async () => {
      const lessonWithNewlines: Lesson = {
        ...mockLesson,
        sections: [
          {
            title: 'Test',
            content: 'Line 1\nLine 2\nLine 3',
            examples: [],
          },
        ],
        id: 'newlines-lesson',
      }
      ;(grammarApi.getLesson as jest.Mock).mockResolvedValue(lessonWithNewlines)

      renderWithRoute('newlines-lesson')

      await waitFor(() => {
        const content = screen.getByTestId('lesson-section-content-0')
        expect(content.innerHTML).toContain('<br')
      })
    })

    it('handles empty sections array', async () => {
      const lessonWithNoSections: Lesson = {
        ...mockLesson,
        sections: [],
        id: 'no-sections-lesson',
      }
      ;(grammarApi.getLesson as jest.Mock).mockResolvedValue(lessonWithNoSections)

      renderWithRoute('no-sections-lesson')

      await waitFor(() => {
        expect(screen.getByText(/Sections: 0/i)).toBeInTheDocument()
      })
    })

    it('handles sections without examples', async () => {
      const lessonWithoutExamples: Lesson = {
        ...mockLesson,
        sections: [
          {
            title: 'No Examples',
            content: 'Content without examples',
            examples: [],
          },
        ],
        id: 'no-examples-lesson',
      }
      ;(grammarApi.getLesson as jest.Mock).mockResolvedValue(lessonWithoutExamples)

      renderWithRoute('no-examples-lesson')

      await waitFor(() => {
        expect(screen.getByText('Content without examples')).toBeInTheDocument()
        // Should not have Examples section
        expect(screen.queryByText('Examples:')).not.toBeInTheDocument()
      })
    })
  })
})
