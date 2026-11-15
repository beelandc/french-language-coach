/**
 * Tests for the Storybook mock sessions provider (Issue #250)
 *
 * - setCurrentSessionId used to call an undefined setter and throw a ReferenceError
 * - The mock context now implements lockSession / unlockSession like the real one
 * - Mock sessions/feedback match the current Session / Feedback types
 */

import { useState } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MockSessionsProvider, StorybookSessionsProvider } from './storybookMocks'
import { useSessions } from '../hooks/useSessions'

function SessionIdProbe() {
  const { currentSessionId, setCurrentSessionId } = useSessions()
  return (
    <>
      <span data-testid="current-session-id">{currentSessionId ?? 'none'}</span>
      <button onClick={() => setCurrentSessionId('abc')}>select</button>
      <button onClick={() => setCurrentSessionId(null)}>clear</button>
    </>
  )
}

function LockProbe() {
  const { lockSession, unlockSession } = useSessions()
  const [result, setResult] = useState('idle')
  return (
    <>
      <span data-testid="lock-result">{result}</span>
      <button
        onClick={async () => {
          const locked = await lockSession('mock-session-1', 'client-1')
          const unlocked = await unlockSession('mock-session-1')
          setResult(`${String(locked)}/${String(unlocked)}`)
        }}
      >
        lock
      </button>
    </>
  )
}

function SessionsProbe() {
  const { sessions } = useSessions()
  return <pre data-testid="sessions">{JSON.stringify(sessions)}</pre>
}

function CreateSessionProbe() {
  const { createSession, currentSessionId } = useSessions()
  return (
    <>
      <button onClick={() => createSession('ask_directions')}>create</button>
      <span data-testid="current-session-id">{currentSessionId ?? 'none'}</span>
    </>
  )
}

describe('MockSessionsProvider', () => {
  it('updates currentSessionId through setCurrentSessionId without throwing', () => {
    render(
      <MockSessionsProvider currentSessionId={null}>
        <SessionIdProbe />
      </MockSessionsProvider>
    )

    expect(screen.getByTestId('current-session-id')).toHaveTextContent('none')

    fireEvent.click(screen.getByText('select'))
    expect(screen.getByTestId('current-session-id')).toHaveTextContent('abc')

    fireEvent.click(screen.getByText('clear'))
    expect(screen.getByTestId('current-session-id')).toHaveTextContent('none')
  })

  it('provides lockSession and unlockSession that resolve without a value', async () => {
    render(
      <MockSessionsProvider>
        <LockProbe />
      </MockSessionsProvider>
    )

    fireEvent.click(screen.getByText('lock'))

    await waitFor(() => {
      expect(screen.getByTestId('lock-result')).toHaveTextContent('undefined/undefined')
    })
  })

  it('exposes mock sessions with lock fields and feedback without session_id', () => {
    render(
      <StorybookSessionsProvider.WithFeedback>
        <SessionsProbe />
      </StorybookSessionsProvider.WithFeedback>
    )

    const [session] = JSON.parse(screen.getByTestId('sessions').textContent || '[]')
    expect(session.is_locked).toBe(false)
    expect(session.locked_at).toBeNull()
    expect(session.locked_by).toBeNull()
    expect(session.feedback.overall_score).toBe(88)
    expect(session.feedback).not.toHaveProperty('session_id')
  })

  it('creates a session with the default difficulty and lock fields', async () => {
    render(
      <MockSessionsProvider initialSessions={[]} currentSessionId={null}>
        <CreateSessionProbe />
        <SessionsProbe />
      </MockSessionsProvider>
    )

    fireEvent.click(screen.getByText('create'))

    await waitFor(() => {
      expect(screen.getByTestId('current-session-id')).toHaveTextContent(/^new-mock-session-/)
    })
    const [session] = JSON.parse(screen.getByTestId('sessions').textContent || '[]')
    expect(session).toMatchObject({
      scenario_id: 'ask_directions',
      difficulty: 'intermediate',
      messages: [],
      feedback: null,
      is_locked: false,
      locked_at: null,
      locked_by: null,
    })
  })

  it('defaults to the mock session with messages', () => {
    render(
      <StorybookSessionsProvider.WithMessages>
        <SessionsProbe />
        <SessionIdProbe />
      </StorybookSessionsProvider.WithMessages>
    )

    const [session] = JSON.parse(screen.getByTestId('sessions').textContent || '[]')
    expect(session.id).toBe('mock-session-1')
    expect(session.messages).toHaveLength(3)
    expect(screen.getByTestId('current-session-id')).toHaveTextContent('mock-session-1')
  })
})
