/**
 * Tests for FeedbackView error state (Issue #229)
 *
 * If generating feedback fails (e.g. 502), the page shows the error with "Try again",
 * which re-requests feedback, and "Back to Home".
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import FeedbackView from './FeedbackView'
import { useSessions } from '../hooks/useSessions'

const mockNavigate = jest.fn()

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

jest.mock('../hooks/useSessions', () => ({
  useSessions: jest.fn(),
}))

jest.mock('../utils/pdfExport', () => ({
  generateFeedbackPDF: jest.fn(),
}))

jest.mock('./RecommendedLessons', () => ({
  __esModule: true,
  default: () => null,
}))

const FEEDBACK_502_DETAIL =
  'Feedback could not be generated: the AI returned invalid feedback twice. Your session is still open — please try again.'

const feedback = {
  grammar_score: 72,
  vocabulary_score: 65,
  fluency_score: 70,
  overall_score: 69,
  strengths: ['Bonne prononciation'],
  focus_area: 'Accord du participe passé',
  example_corrections: [
    { original: 'au le café', corrected: 'au café', explanation: 'au = à + le' },
  ],
}

function mockGetFeedback(getFeedback: jest.Mock) {
  ;(useSessions as jest.Mock).mockReturnValue({ getFeedback, isLoading: false })
}

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

describe('FeedbackView error state (Issue #229)', () => {
  it('shows the error with Try again and Back to Home', async () => {
    mockGetFeedback(jest.fn().mockRejectedValue(new Error(FEEDBACK_502_DETAIL)))
    render(<FeedbackView sessionId="7" />)

    expect(await screen.findByTestId('feedback-error')).toHaveTextContent(FEEDBACK_502_DETAIL)
    expect(screen.getByTestId('retry-feedback-button')).toHaveTextContent('Try again')
    fireEvent.click(screen.getByTestId('back-to-home-button'))
    expect(mockNavigate).toHaveBeenCalledWith('/scenarios')
  })

  it('re-requests feedback on Try again and renders it', async () => {
    const getFeedback = jest
      .fn()
      .mockRejectedValueOnce(new Error(FEEDBACK_502_DETAIL))
      .mockResolvedValueOnce(feedback)
    mockGetFeedback(getFeedback)
    render(<FeedbackView sessionId="7" />)

    fireEvent.click(await screen.findByTestId('retry-feedback-button'))

    expect(await screen.findByTestId('feedback-view')).toBeInTheDocument()
    expect(screen.queryByTestId('feedback-error')).not.toBeInTheDocument()
    expect(getFeedback).toHaveBeenCalledTimes(2)
    expect(getFeedback).toHaveBeenLastCalledWith('7')
  })

  it('offers no retry when there is no session id', async () => {
    const getFeedback = jest.fn()
    mockGetFeedback(getFeedback)
    render(<FeedbackView sessionId="" />)

    expect(await screen.findByTestId('feedback-error')).toHaveTextContent('No session ID provided')
    expect(screen.queryByTestId('retry-feedback-button')).not.toBeInTheDocument()
    expect(getFeedback).not.toHaveBeenCalled()
  })
})

describe('FeedbackView with feedback', () => {
  it('renders feedback and its navigation actions', async () => {
    mockGetFeedback(jest.fn().mockResolvedValue(feedback))
    render(<FeedbackView sessionId="7" />)

    expect(await screen.findByTestId('feedback-view')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('back-to-chat-button'))
    expect(mockNavigate).toHaveBeenCalledWith('/chat/7')
    fireEvent.click(screen.getByTestId('new-session-button'))
    expect(mockNavigate).toHaveBeenCalledWith('/scenarios')
  })

  it('exports to PDF and shows export errors', async () => {
    const { generateFeedbackPDF } = jest.requireMock('../utils/pdfExport') as { generateFeedbackPDF: jest.Mock }
    generateFeedbackPDF.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('PDF failed'))
    mockGetFeedback(jest.fn().mockResolvedValue(feedback))
    render(<FeedbackView sessionId="7" />)

    fireEvent.click(await screen.findByTestId('export-pdf-button'))
    await waitFor(() => expect(generateFeedbackPDF).toHaveBeenCalledWith(feedback, '7'))
    fireEvent.click(screen.getByTestId('export-pdf-button'))

    expect(await screen.findByTestId('pdf-error-notice')).toHaveTextContent('PDF failed')
  })

  it('shows the empty state when no feedback is returned', async () => {
    mockGetFeedback(jest.fn().mockResolvedValue(null))
    render(<FeedbackView sessionId="7" />)

    expect(await screen.findByTestId('no-feedback-container')).toBeInTheDocument()
  })
})
