/**
 * Tests for SessionsProvider.createSession (Issue #250)
 *
 * POST /sessions/ returns backend messages as { role, content } pairs (which may include the
 * AI greeting). createSession must map them to frontend Messages with an id, session_id and
 * created_at, and copy the session lock fields into the new Session.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SessionsProvider, useSessions } from './useSessions'
import type { Difficulty } from '../types/index'

// Import sessionApi as a mocked module
import * as apiModule from '../utils/api'
const { sessionApi } = apiModule as unknown as { sessionApi: { create: jest.Mock } }

jest.mock('../utils/api', () => ({
  sessionApi: {
    create: jest.fn(),
  },
}))

function CreateSessionProbe({ difficulty }: { difficulty?: Difficulty }) {
  const { createSession, sessions, currentSessionId } = useSessions()
  return (
    <>
      <button onClick={() => createSession('cafe_order', difficulty)}>create</button>
      <span data-testid="current-session-id">{currentSessionId ?? 'none'}</span>
      <pre data-testid="sessions">{JSON.stringify(sessions)}</pre>
    </>
  )
}

const readSessions = () => JSON.parse(screen.getByTestId('sessions').textContent || '[]')

describe('SessionsProvider.createSession', () => {
  it('maps greeting messages from POST /sessions/ to frontend messages', async () => {
    sessionApi.create.mockResolvedValue({
      id: 7,
      scenario_id: 'cafe_order',
      difficulty: 'beginner',
      created_at: '2026-11-15T10:00:00Z',
      ended_at: null,
      messages: [
        { role: 'assistant', content: 'Bonjour !' },
        { role: 'assistant', content: 'Que désirez-vous ?' },
      ],
      feedback: null,
      is_locked: false,
      locked_at: null,
      locked_by: null,
    })

    render(
      <SessionsProvider>
        <CreateSessionProbe difficulty="beginner" />
      </SessionsProvider>
    )
    fireEvent.click(screen.getByText('create'))

    await waitFor(() => expect(readSessions()).toHaveLength(1))

    expect(sessionApi.create).toHaveBeenCalledWith('cafe_order', 'beginner')
    expect(screen.getByTestId('current-session-id')).toHaveTextContent('7')
    expect(readSessions()[0]).toEqual({
      id: '7',
      scenario_id: 'cafe_order',
      difficulty: 'beginner',
      created_at: '2026-11-15T10:00:00Z',
      ended_at: null,
      messages: [
        {
          id: '7-0',
          session_id: '7',
          role: 'assistant',
          content: 'Bonjour !',
          created_at: '2026-11-15T10:00:00Z',
        },
        {
          id: '7-1',
          session_id: '7',
          role: 'assistant',
          content: 'Que désirez-vous ?',
          created_at: '2026-11-15T10:00:00Z',
        },
      ],
      feedback: null,
      is_locked: false,
      locked_at: null,
      locked_by: null,
    })
  })

  it('defaults messages, lock fields and difficulty when the response omits them', async () => {
    sessionApi.create.mockResolvedValue({
      id: 8,
      scenario_id: 'cafe_order',
      created_at: '2026-11-15T11:00:00Z',
    })

    render(
      <SessionsProvider>
        <CreateSessionProbe />
      </SessionsProvider>
    )
    fireEvent.click(screen.getByText('create'))

    await waitFor(() => expect(readSessions()).toHaveLength(1))

    const [session] = readSessions()
    expect(session.messages).toEqual([])
    expect(session.difficulty).toBe('intermediate')
    expect(session.is_locked).toBe(false)
    expect(session.locked_at).toBeNull()
    expect(session.locked_by).toBeNull()
  })

  it('copies lock fields from the response', async () => {
    sessionApi.create.mockResolvedValue({
      id: 9,
      scenario_id: 'cafe_order',
      difficulty: 'advanced',
      created_at: '2026-11-15T12:00:00Z',
      messages: [],
      is_locked: true,
      locked_at: '2026-11-15T12:00:01Z',
      locked_by: 'client-1',
    })

    render(
      <SessionsProvider>
        <CreateSessionProbe difficulty="advanced" />
      </SessionsProvider>
    )
    fireEvent.click(screen.getByText('create'))

    await waitFor(() => expect(readSessions()).toHaveLength(1))

    const [session] = readSessions()
    expect(session.is_locked).toBe(true)
    expect(session.locked_at).toBe('2026-11-15T12:00:01Z')
    expect(session.locked_by).toBe('client-1')
  })
})
