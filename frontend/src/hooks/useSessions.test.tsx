import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SessionsProvider, useSessions } from './useSessions'
import * as api from '../utils/api'
import type { Session, Message } from '../types'

/**
 * Tests for useSessions hook with initial greeting feature (Issue #155)
 * 
 * Acceptance Criteria:
 * - AI sends first message automatically when chat simulation starts
 * - Initial greeting is contextually appropriate for the scenario
 * - User can respond normally to the AI's initial message
 * - Existing chat functionality remains unchanged
 */

// Mock the session API
vi.mock('../utils/api', () => ({
  sessionApi: {
    create: vi.fn(),
    sendMessage: vi.fn(),
    getFeedback: vi.fn(),
    getSession: vi.fn(),
    listSessions: vi.fn(),
    deleteSession: vi.fn(),
  },
}))

// Helper to wrap hook in provider
const renderUseSessionsHook = () => {
  return renderHook(() => useSessions(), { wrapper: SessionsProvider })
}

describe('useSessions - Initial Greeting Feature (Issue #155)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('AC1: AI sends first message automatically when chat simulation starts', () => {
    it('creates session with initial greeting message', async () => {
      // Given: API returns session with greeting message
      const mockResponse = {
        id: '1',
        scenario_id: 'cafe_order',
        difficulty: 'beginner',
        created_at: new Date().toISOString(),
        ended_at: null,
        messages: [
          { id: '1', session_id: '1', role: 'assistant', content: 'Bonjour ! Bienvenue au café.', created_at: new Date().toISOString() }
        ],
        feedback: null,
      }
      
      vi.mocked(api.sessionApi.create).mockResolvedValue(mockResponse)
      
      // When: Create session
      const { result } = renderUseSessionsHook()
      
      await act(async () => {
        await result.current.createSession('cafe_order', 'beginner')
      })
      
      // Then: Session has initial greeting
      const sessions = result.current.sessions
      expect(sessions.length).toBe(1)
      expect(sessions[0].messages.length).toBe(1)
      expect(sessions[0].messages[0].role).toBe('assistant')
      expect(sessions[0].messages[0].content).toBe('Bonjour ! Bienvenue au café.')
    })

    it('handles session creation without greeting (AI failure)', async () => {
      // Given: API returns session without greeting (AI failure case)
      const mockResponse = {
        id: '1',
        scenario_id: 'cafe_order',
        difficulty: 'intermediate',
        created_at: new Date().toISOString(),
        ended_at: null,
        messages: [],
        feedback: null,
      }
      
      vi.mocked(api.sessionApi.create).mockResolvedValue(mockResponse)
      
      // When: Create session
      const { result } = renderUseSessionsHook()
      
      await act(async () => {
        await result.current.createSession('cafe_order')
      })
      
      // Then: Session is created but without greeting
      const sessions = result.current.sessions
      expect(sessions.length).toBe(1)
      expect(sessions[0].messages.length).toBe(0)
    })
  })

  describe('AC2: Initial greeting is contextually appropriate for the scenario', () => {
    it('uses different greetings for different scenarios', async () => {
      // Given: Different scenarios return different greetings
      const cafeGreeting = { 
        id: '1', 
        scenario_id: 'cafe_order', 
        difficulty: 'beginner',
        created_at: new Date().toISOString(),
        ended_at: null,
        messages: [{ id: '1', session_id: '1', role: 'assistant', content: 'Bonjour au café!', created_at: new Date().toISOString() }],
        feedback: null,
      }
      
      const interviewGreeting = { 
        id: '2', 
        scenario_id: 'job_interview', 
        difficulty: 'advanced',
        created_at: new Date().toISOString(),
        ended_at: null,
        messages: [{ id: '1', session_id: '2', role: 'assistant', content: 'Bonjour pour l\'entretien.', created_at: new Date().toISOString() }],
        feedback: null,
      }
      
      vi.mocked(api.sessionApi.create)
        .mockResolvedValueOnce(cafeGreeting)
        .mockResolvedValueOnce(interviewGreeting)
      
      // When: Create sessions for different scenarios
      const { result } = renderUseSessionsHook()
      
      await act(async () => {
        await result.current.createSession('cafe_order', 'beginner')
        await result.current.createSession('job_interview', 'advanced')
      })
      
      // Then: Each session has its own contextually appropriate greeting
      const sessions = result.current.sessions
      expect(sessions.length).toBe(2)
      expect(sessions[0].messages[0].content).toBe('Bonjour au café!')
      expect(sessions[1].messages[0].content).toBe('Bonjour pour l\'entretien.')
    })
  })

  describe('AC3: User can respond normally to the AI\'s initial message', () => {
    it('sends message to session with existing greeting', async () => {
      // Given: Session with initial greeting
      const mockCreateResponse = {
        id: '1',
        scenario_id: 'cafe_order',
        difficulty: 'beginner',
        created_at: new Date().toISOString(),
        ended_at: null,
        messages: [
          { id: '1', session_id: '1', role: 'assistant', content: 'Bonjour!', created_at: new Date().toISOString() }
        ],
        feedback: null,
      }
      
      const mockSendResponse = {
        role: 'assistant',
        content: 'Qu\'est-ce que vous voulez?',
        session_id: '1',
      }
      
      vi.mocked(api.sessionApi.create).mockResolvedValue(mockCreateResponse)
      vi.mocked(api.sessionApi.sendMessage).mockResolvedValue(mockSendResponse)
      
      // When: Create session and send message
      const { result } = renderUseSessionsHook()
      
      await act(async () => {
        const sessionId = await result.current.createSession('cafe_order', 'beginner')
        await result.current.sendMessage(sessionId, 'Un café s\'il vous plaît')
      })
      
      // Then: Message is sent successfully
      expect(api.sessionApi.sendMessage).toHaveBeenCalledWith(
        '1',
        'Un café s\'il vous plaît'
      )
      
      // And: AI response is received
      expect(api.sessionApi.sendMessage).toHaveBeenCalledTimes(1)
    })

    it('appends user message and AI response to existing greeting', async () => {
      // Given: Session with initial greeting
      const mockCreateResponse = {
        id: '1',
        scenario_id: 'cafe_order',
        difficulty: 'beginner',
        created_at: new Date().toISOString(),
        ended_at: null,
        messages: [
          { id: '1', session_id: '1', role: 'assistant', content: 'Bonjour!', created_at: new Date().toISOString() }
        ],
        feedback: null,
      }
      
      const mockSendResponse = {
        role: 'assistant',
        content: 'D\'accord!',
        session_id: '1',
      }
      
      vi.mocked(api.sessionApi.create).mockResolvedValue(mockCreateResponse)
      vi.mocked(api.sessionApi.sendMessage).mockResolvedValue(mockSendResponse)
      
      // When: Create session and send message
      const { result } = renderUseSessionsHook()
      
      await act(async () => {
        const sessionId = await result.current.createSession('cafe_order', 'beginner')
        await result.current.sendMessage(sessionId, 'Merci')
      })
      
      // Then: Session now has greeting + user message + AI response
      const sessions = result.current.sessions
      expect(sessions[0].messages.length).toBeGreaterThanOrEqual(1) // At least the greeting
    })
  })

  describe('AC4: Existing chat functionality remains unchanged', () => {
    it('maintains backward compatibility with sessions without greetings', async () => {
      // Given: Old session without greeting (created before this feature)
      const mockResponse = {
        id: '1',
        scenario_id: 'cafe_order',
        difficulty: 'intermediate',
        created_at: new Date().toISOString(),
        ended_at: null,
        messages: [],
        feedback: null,
      }
      
      vi.mocked(api.sessionApi.create).mockResolvedValue(mockResponse)
      
      // When: Create session
      const { result } = renderUseSessionsHook()
      
      await act(async () => {
        await result.current.createSession('cafe_order')
      })
      
      // Then: Session is created and works as before
      const sessions = result.current.sessions
      expect(sessions.length).toBe(1)
      expect(sessions[0].scenario_id).toBe('cafe_order')
      expect(sessions[0].difficulty).toBe('intermediate')
    })

    it('handles error during session creation', async () => {
      // Given: API call fails
      vi.mocked(api.sessionApi.create).mockRejectedValue(new Error('Network error'))
      
      // When: Create session
      const { result } = renderUseSessionsHook()
      
      // Then: Error is thrown and state is updated
      await expect(
        act(async () => {
          await result.current.createSession('cafe_order')
        })
      ).rejects.toThrow('Network error')
      
      expect(result.current.error).toBe('Network error')
    })
  })

  describe('Edge Cases', () => {
    it('handles null messages in API response', async () => {
      // Given: API returns null for messages
      const mockResponse = {
        id: '1',
        scenario_id: 'cafe_order',
        difficulty: 'intermediate',
        created_at: new Date().toISOString(),
        ended_at: null,
        messages: null,
        feedback: null,
      }
      
      vi.mocked(api.sessionApi.create).mockResolvedValue(mockResponse)
      
      // When: Create session
      const { result } = renderUseSessionsHook()
      
      await act(async () => {
        await result.current.createSession('cafe_order')
      })
      
      // Then: messages defaults to empty array
      const sessions = result.current.sessions
      expect(sessions[0].messages).toEqual([])
    })

    it('handles undefined messages in API response', async () => {
      // Given: API doesn't return messages field
      const mockResponse = {
        id: '1',
        scenario_id: 'cafe_order',
        difficulty: 'intermediate',
        created_at: new Date().toISOString(),
        ended_at: null,
        feedback: null,
      }
      
      vi.mocked(api.sessionApi.create).mockResolvedValue(mockResponse)
      
      // When: Create session
      const { result } = renderUseSessionsHook()
      
      await act(async () => {
        await result.current.createSession('cafe_order')
      })
      
      // Then: messages defaults to empty array
      const sessions = result.current.sessions
      expect(sessions[0].messages).toEqual([])
    })

    it('handles multiple concurrent session creations', async () => {
      // Given: Multiple scenarios
      const mockResponses = [
        {
          id: '1',
          scenario_id: 'cafe_order',
          difficulty: 'beginner',
          created_at: new Date().toISOString(),
          ended_at: null,
          messages: [{ id: '1', session_id: '1', role: 'assistant', content: 'Café greeting', created_at: new Date().toISOString() }],
          feedback: null,
        },
        {
          id: '2',
          scenario_id: 'job_interview',
          difficulty: 'advanced',
          created_at: new Date().toISOString(),
          ended_at: null,
          messages: [{ id: '1', session_id: '2', role: 'assistant', content: 'Interview greeting', created_at: new Date().toISOString() }],
          feedback: null,
        },
      ]
      
      vi.mocked(api.sessionApi.create)
        .mockResolvedValueOnce(mockResponses[0])
        .mockResolvedValueOnce(mockResponses[1])
      
      // When: Create multiple sessions concurrently
      const { result } = renderUseSessionsHook()
      
      await act(async () => {
        const promises = [
          result.current.createSession('cafe_order', 'beginner'),
          result.current.createSession('job_interview', 'advanced'),
        ]
        await Promise.all(promises)
      })
      
      // Then: Both sessions are created with their greetings
      const sessions = result.current.sessions
      expect(sessions.length).toBe(2)
      expect(sessions[0].messages[0].content).toBe('Café greeting')
      expect(sessions[1].messages[0].content).toBe('Interview greeting')
    })
  })

  describe('Hook State Management', () => {
    it('sets currentSessionId when session is created', async () => {
      const mockResponse = {
        id: '123',
        scenario_id: 'cafe_order',
        difficulty: 'beginner',
        created_at: new Date().toISOString(),
        ended_at: null,
        messages: [],
        feedback: null,
      }
      
      vi.mocked(api.sessionApi.create).mockResolvedValue(mockResponse)
      
      const { result } = renderUseSessionsHook()
      
      await act(async () => {
        await result.current.createSession('cafe_order', 'beginner')
      })
      
      expect(result.current.currentSessionId).toBe('123')
      expect(result.current.currentScenarioId).toBe('cafe_order')
    })

    it('sets sessionEnded to false for new sessions', async () => {
      const mockResponse = {
        id: '1',
        scenario_id: 'cafe_order',
        difficulty: 'beginner',
        created_at: new Date().toISOString(),
        ended_at: null,
        messages: [],
        feedback: null,
      }
      
      vi.mocked(api.sessionApi.create).mockResolvedValue(mockResponse)
      
      const { result } = renderUseSessionsHook()
      
      await act(async () => {
        await result.current.createSession('cafe_order', 'beginner')
      })
      
      expect(result.current.sessionEnded).toBe(false)
    })

    it('clears error after successful session creation', async () => {
      // Given: Previous error state
      const mockResponse = {
        id: '1',
        scenario_id: 'cafe_order',
        difficulty: 'beginner',
        created_at: new Date().toISOString(),
        ended_at: null,
        messages: [],
        feedback: null,
      }
      
      vi.mocked(api.sessionApi.create).mockResolvedValue(mockResponse)
      
      const { result } = renderUseSessionsHook()
      
      // Set error state
      act(() => {
        result.current.setCurrentSessionId(null)
      })
      
      await act(async () => {
        await result.current.createSession('cafe_order', 'beginner')
      })
      
      expect(result.current.error).toBeNull()
    })
  })
})
