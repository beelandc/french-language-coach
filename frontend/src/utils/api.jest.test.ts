/**
 * Tests for the API client (Issue #250)
 *
 * - searchReferences leaves out empty filters (the removed `!== ''` checks were redundant
 *   because the truthiness check already excludes '')
 * - sessionApi.create posts to /sessions/ and returns the backend session payload
 */

import { grammarApi, sessionApi } from './api'

const mockFetch = jest.fn()

const jsonResponse = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
})

beforeEach(() => {
  mockFetch.mockResolvedValue(jsonResponse({}))
  global.fetch = mockFetch as unknown as typeof fetch
})

describe('grammarApi.searchReferences', () => {
  it('omits empty query, category and difficulty filters', async () => {
    await grammarApi.searchReferences(undefined, '', '')

    expect(mockFetch).toHaveBeenCalledWith(
      '/grammar/reference/?page=1&per_page=10',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('includes every non-empty filter (URL-encoded) and the pagination values', async () => {
    await grammarApi.searchReferences('subj', 'Sentence Structure', 'beginner', 2, 5)

    expect(mockFetch).toHaveBeenCalledWith(
      '/grammar/reference/?page=2&per_page=5&q=subj&category=Sentence%20Structure&difficulty=beginner',
      expect.objectContaining({ method: 'GET' })
    )
  })
})

describe('sessionApi.create', () => {
  it('posts the scenario and difficulty and returns the backend session', async () => {
    const backendSession = {
      id: 7,
      scenario_id: 'cafe_order',
      difficulty: 'beginner',
      created_at: '2026-11-15T10:00:00Z',
      messages: [{ role: 'assistant', content: 'Bonjour !' }],
      is_locked: false,
    }
    mockFetch.mockResolvedValue(jsonResponse(backendSession))

    const result = await sessionApi.create('cafe_order', 'beginner')

    expect(result).toEqual(backendSession)
    const [url, config] = mockFetch.mock.calls[0]
    expect(url).toBe('/sessions/')
    expect(config.method).toBe('POST')
    expect(JSON.parse(config.body)).toEqual({ scenario_id: 'cafe_order', difficulty: 'beginner' })
  })

  it('throws the backend detail on an error response', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ detail: 'Unknown scenario' }, 400))

    await expect(sessionApi.create('nope')).rejects.toThrow('Unknown scenario')
  })
})
