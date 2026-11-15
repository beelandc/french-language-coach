/**
 * Tests for ChatInterface feedback errors (Issue #229)
 *
 * When feedback generation fails (the backend returns 502 after its retry), the chat
 * shows the error once, keeps the user on the page, and offers "Retry feedback".
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ChatInterface from './ChatInterface'
import { useSessions } from '../hooks/useSessions'

const mockNavigate = jest.fn()

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

jest.mock('../hooks/useSessions', () => ({
  useSessions: jest.fn(),
}))

const FEEDBACK_502_DETAIL =
  'Feedback could not be generated: the AI returned invalid feedback twice. Your session is still open — please try again.'

const session = {
  id: '7',
  scenario_id: 'cafe_order',
  created_at: '2026-11-15T09:00:00Z',
  ended_at: null,
  messages: [
    { id: '1', session_id: '7', role: 'assistant', content: 'Bonjour !', created_at: '2026-11-15T09:00:00Z' },
    { id: '2', session_id: '7', role: 'user', content: 'Un café', created_at: '2026-11-15T09:00:05Z' },
  ],
  feedback: null,
}

function mockHook(overrides: Record<string, unknown> = {}) {
  const hook = {
    currentScenarioId: 'cafe_order',
    sessionEnded: false,
    isLoading: false,
    error: null,
    sendMessage: jest.fn(),
    getFeedback: jest.fn(),
    clearError: jest.fn(),
    sessions: [session],
    lockSession: jest.fn().mockResolvedValue(undefined),
    unlockSession: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }
  ;(useSessions as jest.Mock).mockReturnValue(hook)
  return hook
}

beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn()
})

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

describe('ChatInterface feedback errors (Issue #229)', () => {
  it('navigates to the feedback page when feedback succeeds', async () => {
    const hook = mockHook({ getFeedback: jest.fn().mockResolvedValue({ overall_score: 69 }) })
    render(<ChatInterface sessionId="7" />)

    fireEvent.click(screen.getByTestId('end-session-button'))

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/feedback/7'))
    expect(hook.getFeedback).toHaveBeenCalledWith('7')
    expect(screen.queryByTestId('feedback-error')).not.toBeInTheDocument()
  })

  it('shows the 502 message once with a retry button and stays on the chat page', async () => {
    const hook = mockHook({ getFeedback: jest.fn().mockRejectedValue(new Error(FEEDBACK_502_DETAIL)) })
    render(<ChatInterface sessionId="7" />)

    fireEvent.click(screen.getByTestId('end-session-button'))

    const alert = await screen.findByTestId('feedback-error')
    expect(alert).toHaveTextContent(FEEDBACK_502_DETAIL)
    expect(alert).toHaveAttribute('role', 'alert')
    expect(screen.getAllByText(FEEDBACK_502_DETAIL)).toHaveLength(1)
    expect(screen.queryByTestId('chat-error')).not.toBeInTheDocument()
    expect(hook.clearError).toHaveBeenCalled()
    expect(screen.getByTestId('retry-feedback-button')).toBeEnabled()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('retries feedback generation and navigates on success', async () => {
    const getFeedback = jest
      .fn()
      .mockRejectedValueOnce(new Error(FEEDBACK_502_DETAIL))
      .mockResolvedValueOnce({ overall_score: 69 })
    mockHook({ getFeedback })
    render(<ChatInterface sessionId="7" />)

    fireEvent.click(screen.getByTestId('end-session-button'))
    fireEvent.click(await screen.findByTestId('retry-feedback-button'))

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/feedback/7'))
    expect(getFeedback).toHaveBeenCalledTimes(2)
    expect(screen.queryByTestId('feedback-error')).not.toBeInTheDocument()
  })

  it('prevents a second request while a retry is in flight', async () => {
    let resolveRetry: (value: unknown) => void = () => {}
    const getFeedback = jest
      .fn()
      .mockRejectedValueOnce(new Error(FEEDBACK_502_DETAIL))
      .mockImplementationOnce(() => new Promise(resolve => { resolveRetry = resolve }))
    mockHook({ getFeedback })
    render(<ChatInterface sessionId="7" />)

    fireEvent.click(screen.getByTestId('end-session-button'))
    fireEvent.click(await screen.findByTestId('retry-feedback-button'))

    // The error clears while retrying; End Session is disabled so it can't be sent twice
    await waitFor(() => expect(screen.queryByTestId('feedback-error')).not.toBeInTheDocument())
    expect(screen.getByTestId('end-session-button')).toBeDisabled()
    fireEvent.click(screen.getByTestId('end-session-button'))
    expect(getFeedback).toHaveBeenCalledTimes(2)

    resolveRetry({ overall_score: 69 })
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/feedback/7'))
  })

  it('uses a generic message when the error is not an Error instance', async () => {
    mockHook({ getFeedback: jest.fn().mockRejectedValue('boom') })
    render(<ChatInterface sessionId="7" />)

    fireEvent.click(screen.getByTestId('end-session-button'))

    expect(await screen.findByTestId('feedback-error')).toHaveTextContent('Failed to generate feedback')
  })
})

describe('ChatInterface basics', () => {
  it('sends a message and clears the input', async () => {
    const hook = mockHook({ sendMessage: jest.fn().mockResolvedValue({}) })
    render(<ChatInterface sessionId="7" />)

    fireEvent.change(screen.getByTestId('message-input'), { target: { value: 'Merci' } })
    fireEvent.submit(screen.getByTestId('message-form'))

    await waitFor(() => expect(hook.sendMessage).toHaveBeenCalledWith('7', 'Merci'))
    expect(screen.getByTestId('message-input')).toHaveValue('')
  })

  it('shows send errors in chat-error, separate from feedback errors', async () => {
    mockHook({ sendMessage: jest.fn().mockRejectedValue(new Error('Network down')) })
    render(<ChatInterface sessionId="7" />)

    fireEvent.change(screen.getByTestId('message-input'), { target: { value: 'Merci' } })
    fireEvent.submit(screen.getByTestId('message-form'))

    expect(await screen.findByTestId('chat-error')).toHaveTextContent('Network down')
    expect(screen.queryByTestId('feedback-error')).not.toBeInTheDocument()
  })

  it('ignores an empty message', () => {
    const hook = mockHook()
    render(<ChatInterface sessionId="7" />)

    fireEvent.submit(screen.getByTestId('message-form'))

    expect(hook.sendMessage).not.toHaveBeenCalled()
  })

  it('navigates back to scenarios', () => {
    mockHook()
    render(<ChatInterface sessionId="7" />)

    fireEvent.click(screen.getByTestId('back-button'))

    expect(mockNavigate).toHaveBeenCalledWith('/scenarios')
  })

  it('falls back to the current scenario name when the session is not loaded', () => {
    mockHook({ sessions: [], currentScenarioId: 'hotel_checkin' })
    render(<ChatInterface sessionId="7" />)

    expect(screen.getByTestId('chat-scenario-name')).toHaveTextContent('Hotel Check-in')
    expect(screen.getByTestId('empty-chat-state')).toBeInTheDocument()
  })

  it('locks on mount, unlocks on unmount, and tolerates lock failures', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    const hook = mockHook({
      lockSession: jest.fn().mockRejectedValue(new Error('locked')),
      unlockSession: jest.fn().mockRejectedValue(new Error('gone')),
    })
    const { unmount } = render(<ChatInterface sessionId="7" />)

    await waitFor(() => expect(hook.lockSession).toHaveBeenCalled())
    unmount()

    await waitFor(() => expect(hook.unlockSession).toHaveBeenCalled())
  })
})
