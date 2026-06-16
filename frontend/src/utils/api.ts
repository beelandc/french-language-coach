// API Client for French Language Coach
import type { 
  Feedback, 
  Session, 
  SessionLockResponse,
  LessonListResponse, 
  LessonResponse, 
  LessonSummary,
  Difficulty,
  ReferenceCategory,
  GrammarReference,
  ReferenceListResponse,
  Exercise,
  ExerciseListResponse,
  // Vocabulary types
  DeckListResponse,
  DeckResponse,
  CardListResponse,
  DueCardsResponse,
  ReviewSubmitRequest,
  ReviewResponse,
  DeckCreateRequest,
  DeckSummary,
} from '../types/index'

// Use relative paths for development (Vite proxy handles routing)
// Use same-origin for production
const API_BASE = '' // Empty string = relative to current origin

interface ApiOptions extends RequestInit {
  data?: unknown
}

/**
 * Generic API client for making requests to the FastAPI backend
 * 
 * In development: Vite proxy forwards /sessions/* to http://localhost:8000
 * In production: Same-origin requests go directly to FastAPI
 */
export async function api<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { data, ...rest } = options
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...rest.headers,
    },
    ...rest,
  }

  if (data) {
    config.body = JSON.stringify(data)
  }

  // Use relative URL - Vite proxy will handle it in dev, same-origin in prod
  const url = `${API_BASE}${endpoint}`
  const response = await fetch(url, config)
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const errorMessage = errorData.detail || `HTTP error! status: ${response.status}`
    throw new Error(errorMessage)
  }

  // Handle 204 No Content responses (e.g., DELETE requests)
  if (response.status === 204) {
    return undefined as unknown as T
  }

  return response.json() as Promise<T>
}

// Session API functions
// Note: Backend returns session_id as integer, but we coerce to string for frontend consistency
export const sessionApi = {
  create: (scenarioId: string, difficulty?: string) => 
    api<{ id: number; scenario_id: string; difficulty: string; created_at: string }>('/sessions/', {
      method: 'POST',
      data: { scenario_id: scenarioId, ...(difficulty && { difficulty }) },
    }),

  sendMessage: (sessionId: string, content: string) =>
    api<{ role: string; content: string; session_id: number }>(
      `/sessions/${sessionId}/messages/`,
      {
        method: 'POST',
        data: { content },
      }
    ),

  getFeedback: (sessionId: string) =>
    api<Feedback>(`/sessions/${sessionId}/feedback/`,
      { method: 'POST' }
    ),

  getSession: (sessionId: string) =>
    api<Session>(`/sessions/${sessionId}`,
      { method: 'GET' }
    ),

  listSessions: (page: number = 1, perPage: number = 10) =>
    api<SessionListResponse>(`/sessions/?page=${page}&per_page=${perPage}`,
      { method: 'GET' }
    ),

  deleteSession: (sessionId: string) =>
    api<void>(`/sessions/${sessionId}`,
      { method: 'DELETE' }
    ),

  lockSession: (sessionId: string, clientId?: string) =>
    api<SessionLockResponse>(`/sessions/${sessionId}/lock`, {
      method: 'POST',
      headers: clientId ? { 'X-Client-ID': clientId } : undefined,
    }),

  unlockSession: (sessionId: string, clientId?: string) =>
    api<SessionLockResponse>(`/sessions/${sessionId}/unlock`, {
      method: 'POST',
      headers: clientId ? { 'X-Client-ID': clientId } : undefined,
    }),
}

// Grammar API functions
export const grammarApi = {
  // Get list of lessons with optional filtering and pagination
  listLessons: (
    page: number = 1,
    perPage: number = 10,
    topic?: string,
    difficulty?: Difficulty
  ) => 
    api<LessonListResponse>(
      `/grammar/lessons/?page=${page}&per_page=${perPage}${topic ? `&topic=${encodeURIComponent(topic)}` : ''}${difficulty ? `&difficulty=${difficulty}` : ''}`,
      { method: 'GET' }
    ),

  // Get a single lesson by ID
  getLesson: (lessonId: string) =>
    api<LessonResponse>(`/grammar/lessons/${lessonId}`, { method: 'GET' }),

  // Search grammar reference entries with optional filtering and pagination
  searchReferences: (
    query?: string,
    category?: ReferenceCategory | '',
    difficulty?: Difficulty | '',
    page: number = 1,
    perPage: number = 10
  ) => {
    // Build query string with only non-empty, non-undefined parameters
    const params: string[] = []
    params.push(`page=${page}`)
    params.push(`per_page=${perPage}`)
    
    if (query) {
      params.push(`q=${encodeURIComponent(query)}`)
    }
    if (category && category !== '') {
      params.push(`category=${encodeURIComponent(category)}`)
    }
    if (difficulty && difficulty !== '') {
      params.push(`difficulty=${encodeURIComponent(difficulty)}`)
    }
    
    const queryString = params.length > 0 ? `?${params.join('&')}` : ''
    return api<ReferenceListResponse>(`/grammar/reference/${queryString}`, { method: 'GET' })
  },

  // Get a single reference entry by ID (convenience function for direct access)
  getReference: (referenceId: string) =>
    api<GrammarReference>(`/grammar/reference/${referenceId}`, { method: 'GET' }),

  // Get list of all exercises (if backend endpoint exists)
  // Note: This may need a backend endpoint to be created in routers/grammar.py
  listExercises: (
    page: number = 1,
    perPage: number = 10,
    type?: string,
    topic?: string,
    difficulty?: Difficulty
  ) => {
    const params: string[] = []
    params.push(`page=${page}`)
    params.push(`per_page=${perPage}`)
    
    if (type) {
      params.push(`type=${encodeURIComponent(type)}`)
    }
    if (topic) {
      params.push(`topic=${encodeURIComponent(topic)}`)
    }
    if (difficulty) {
      params.push(`difficulty=${encodeURIComponent(difficulty)}`)
    }
    
    const queryString = params.length > 0 ? `?${params.join('&')}` : ''
    return api<ExerciseListResponse>(`/grammar/exercises/${queryString}`, { method: 'GET' })
  },

  // Get a single exercise by ID (if backend endpoint exists)
  getExercise: (exerciseId: string) =>
    api<Exercise>(`/grammar/exercises/${exerciseId}`, { method: 'GET' }),
}

// Vocabulary API functions
export const vocabularyApi = {
  // Get list of decks with optional pagination
  listDecks: (
    page: number = 1,
    perPage: number = 10
  ) => 
    api<DeckListResponse>(
      `/vocabulary/decks/?page=${page}&per_page=${perPage}`,
      { method: 'GET' }
    ),

  // Get a single deck by ID
  getDeck: (deckId: number) =>
    api<DeckResponse>(`/vocabulary/decks/${deckId}`, { method: 'GET' }),

  // Get all cards in a specific deck
  listDeckCards: (
    deckId: number,
    page: number = 1,
    perPage: number = 50
  ) =>
    api<CardListResponse>(
      `/vocabulary/decks/${deckId}/cards/?page=${page}&per_page=${perPage}`,
      { method: 'GET' }
    ),

  // Get all cards due for review
  listDueCards: (
    page: number = 1,
    perPage: number = 10
  ) =>
    api<DueCardsResponse>(
      `/vocabulary/due/?page=${page}&per_page=${perPage}`,
      { method: 'GET' }
    ),

  // Submit a card review
  submitReview: (reviewData: ReviewSubmitRequest) =>
    api<ReviewResponse>('/vocabulary/review/', {
      method: 'POST',
      data: reviewData
    }),

  // Create a new deck
  createDeck: (deckData: DeckCreateRequest) =>
    api<DeckResponse>('/vocabulary/decks/', {
      method: 'POST',
      data: deckData
    }),
}

// Re-export types for convenience
export type {
  Scenario,
  Message,
  MessageRole,
  Session,
  Correction,
  ApiError,
  SessionSummary,
  PaginationInfo,
  SessionListResponse,
  SessionLockResponse,
  Difficulty,
  DifficultySelectorProps,
  Lesson,
  LessonSummary,
  LessonSection,
  LessonResponse,
  LessonListResponse,
  LessonCardProps,
  LessonSearchProps,
  LessonBrowserProps,
  LessonDetailProps,
  // Grammar Reference types
  ReferenceCategory,
  GrammarReference,
  ReferenceSummary,
  ReferenceListResponse,
  ReferenceResponse,
  ReferenceCardProps,
  ReferenceSearchProps,
  ReferencePageProps,
  // Exercise types
  ExerciseType,
  ExerciseBase,
  Exercise,
  FillInTheBlankExercise,
  MultipleChoiceExercise,
  TranslationExercise,
  ConjugationExercise,
  SentenceTransformationExercise,
  ExerciseListResponse,
  ExerciseProps,
  FillInTheBlankExerciseProps,
  MultipleChoiceExerciseProps,
  TranslationExerciseProps,
  ConjugationExerciseProps,
  SentenceTransformationExerciseProps,
  ExercisePageProps,
  ExerciseSession,
  // Vocabulary types
  DeckSummary,
  DeckWithProgress,
  DeckListResponse,
  DeckResponse,
  CardSummary,
  CardListResponse,
  DeckPaginationInfo,
  DeckCardProps,
  DeckSearchProps,
  DeckBrowserProps,
  DeckSortOption,
  DeckCreateRequest,
  ReviewSubmitRequest,
  ReviewResponse,
  DueCard,
  DueCardsResponse,
  // Deck Detail and Cards Page types (Issue #201)
  BreadcrumbProps,
  BreadcrumbItem,
  CardForDisplay,
  DeckDetail,
  DeckDetailPageProps,
  DeckCardsPageProps,
  CardListState,
  CardSortOption,
} from '../types/index'
