/**
 * Test Setup for Storybook Vitest Tests
 * 
 * This file is automatically executed before each test file runs.
 * It configures API mocking to prevent real HTTP requests during tests.
 */

import { vi, beforeAll, afterEach, afterAll } from 'vitest'

// Create a mock sessionApi module to prevent real HTTP requests
// This mock is used by components that import sessionApi directly (like SessionHistory)
const mockSessionApi = {
  create: vi.fn(async (scenarioId: string) => ({
    id: Date.now(),
    scenario_id: scenarioId,
    created_at: new Date().toISOString(),
  })),
  sendMessage: vi.fn(async (sessionId: string, content: string) => ({
    role: 'assistant' as const,
    content: `Mock response to: ${content}`,
    session_id: parseInt(sessionId),
  })),
  getFeedback: vi.fn(async (sessionId: string) => ({
    session_id: sessionId,
    grammar_score: 85,
    vocabulary_score: 92,
    fluency_score: 78,
    overall_score: 88,
    strengths: ['Good vocabulary usage', 'Natural phrasing', 'Correct use of polite forms'],
    focus_area: 'grammar',
    example_corrections: [],
  })),
  getSession: vi.fn(async (sessionId: string) => ({
    id: sessionId,
    scenario_id: 'cafe_order',
    created_at: '2026-05-15T10:00:00Z',
    ended_at: null,
    messages: [],
    feedback: null,
  })),
  listSessions: vi.fn(async (page: number = 1, perPage: number = 10) => ({
    sessions: [
      {
        id: '1',
        scenario_id: 'cafe_order',
        scenario_name: 'Ordering at a Café',
        difficulty: 'intermediate',
        created_at: '2026-05-15T10:00:00Z',
        ended_at: '2026-05-15T10:15:00Z',
        overall_score: 88,
      },
      {
        id: '2',
        scenario_id: 'ask_directions',
        scenario_name: 'Asking for Directions',
        difficulty: 'beginner',
        created_at: '2026-05-14T09:30:00Z',
        ended_at: '2026-05-14T09:45:00Z',
        overall_score: 92,
      },
      {
        id: '3',
        scenario_id: 'job_interview',
        scenario_name: 'Job Interview',
        difficulty: 'advanced',
        created_at: '2026-05-13T14:00:00Z',
        ended_at: null,
        overall_score: null,
      },
    ],
    page: 1,
    per_page: 10,
    total: 3,
    total_pages: 1,
  })),
  deleteSession: vi.fn(async (sessionId: string) => undefined),
}

// Mock the utils/api module
vi.mock('./utils/api', () => ({
  sessionApi: mockSessionApi,
  api: vi.fn(),
}))

// Also mock the @ alias import path
vi.mock('@/utils/api', () => ({
  sessionApi: mockSessionApi,
  api: vi.fn(),
}))

// Global test lifecycle hooks
beforeAll(() => {
  // Any global test setup can go here
})

afterEach(() => {
  // Clear all mocks after each test
  vi.clearAllMocks()
})

afterAll(() => {
  // Cleanup after all tests
  vi.restoreAllMocks()
})
