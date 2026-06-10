// MSW Request Handlers for French Language Coach API

import { http, HttpResponse } from 'msw';

// Mock data for sessions
const mockSession: any = {
  id: '1',
  scenario_id: 'ordering-at-cafe',
  difficulty: 'intermediate',
  created_at: '2024-01-15T10:30:00Z',
  ended_at: null,
  messages: [
    {
      id: '1',
      session_id: '1',
      role: 'user' as const,
      content: 'Bonjour, je voudrais un café.',
      created_at: '2024-01-15T10:31:00Z',
    },
    {
      id: '2',
      session_id: '1',
      role: 'assistant' as const,
      content: 'Bonjour ! Quel type de café souhaitez-vous ? Un expresso, un café au lait ?',
      created_at: '2024-01-15T10:31:05Z',
    },
  ],
  feedback: null,
  is_locked: false,
  locked_at: null,
  locked_by: null,
};

const mockFeedback: any = {
  grammar_score: 85,
  vocabulary_score: 78,
  fluency_score: 82,
  overall_score: 81,
  strengths: ['Good vocabulary usage', 'Complex sentences'],
  focus_area: 'grammar',
  example_corrections: [
    {
      original: 'je vais au magasin',
      corrected: 'je vais au magasin',
      explanation: 'Correct!',
    },
  ],
};

const mockSessionList: any[] = [
  mockSession,
  {
    id: '2',
    scenario_id: 'job-interview',
    difficulty: 'advanced',
    created_at: '2024-01-14T09:00:00Z',
    ended_at: null,
    messages: [],
    feedback: null,
    is_locked: false,
    locked_at: null,
    locked_by: null,
  },
];

// Mock data for grammar lessons
const mockLessons: any = {
  items: [
    {
      id: '1',
      title: 'Present Tense Verbs',
      topic: 'Verb Conjugation',
      difficulty: 'beginner',
      summary: 'Learn to conjugate regular -er, -ir, and -re verbs in the present tense.',
      estimated_duration: 15,
    },
    {
      id: '2',
      title: 'Passé Composé',
      topic: 'Past Tenses',
      difficulty: 'intermediate',
      summary: 'Master the passé composé tense with avoir and être.',
      estimated_duration: 20,
    },
  ],
  pagination: {
    page: 1,
    per_page: 10,
    total: 2,
    total_pages: 1,
  },
};

const mockLesson: any = {
  id: '1',
  title: 'Present Tense Verbs',
  topic: 'Verb Conjugation',
  difficulty: 'beginner',
  content: '# Present Tense Verbs\n\nThis lesson covers...',
  sections: [
    {
      title: 'Introduction',
      content: 'Welcome to the present tense lesson.',
      order: 1,
    },
  ],
  exercises: [],
};

// Mock data for grammar reference
const mockReferences: any = {
  items: [
    {
      id: '1',
      title: 'The Present Tense',
      category: 'verb_conjugation' as any,
      difficulty: 'beginner',
      summary: 'How to conjugate verbs in the present tense.',
    },
  ],
  pagination: {
    page: 1,
    per_page: 10,
    total: 1,
    total_pages: 1,
  },
};

// Request handlers
export const handlers = [
  // Session handlers
  http.get('/sessions/:sessionId', ({ params }) => {
    const sessionId = parseInt(params.sessionId as string, 10);
    if (sessionId === 1) {
      return HttpResponse.json(mockSession);
    }
    return HttpResponse.json(
      { detail: 'Session not found' },
      { status: 404 }
    );
  }),

  http.get('/sessions/', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const perPage = parseInt(url.searchParams.get('per_page') || '10', 10);
    return HttpResponse.json({
      items: mockSessionList,
      pagination: {
        page,
        per_page: perPage,
        total_items: mockSessionList.length,
        total_pages: Math.ceil(mockSessionList.length / perPage),
      },
    });
  }),

  http.post('/sessions/', async ({ request }) => {
    const { scenario_id, difficulty } = (await request.json()) as { scenario_id?: string; difficulty?: string };
    return HttpResponse.json(
      {
        id: '123',
        scenario_id: scenario_id || 'default',
        difficulty: difficulty || 'intermediate',
        created_at: new Date().toISOString(),
        ended_at: null,
        messages: [],
        feedback: null,
        is_locked: false,
        locked_at: null,
        locked_by: null,
      },
      { status: 201 }
    );
  }),

  http.post('/sessions/:sessionId/messages/', async ({ params, request }) => {
    const sessionId = params.sessionId;
    const { content } = (await request.json()) as { content?: string };
    return HttpResponse.json({
      role: 'assistant' as const,
      content: `Mock response to: ${content || ''}`,
      session_id: sessionId as string,
    });
  }),

  http.post('/sessions/:sessionId/feedback/', () => {
    return HttpResponse.json(mockFeedback);
  }),

  http.delete('/sessions/:sessionId', () => {
    return HttpResponse.json({}, { status: 204 });
  }),

  // Grammar lesson handlers
  http.get('/grammar/lessons/', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const perPage = parseInt(url.searchParams.get('per_page') || '10', 10);
    const topic = url.searchParams.get('topic') || undefined;
    const difficulty = url.searchParams.get('difficulty') as any || undefined;

    let filteredLessons = mockLessons.items;
    if (topic) {
      filteredLessons = filteredLessons.filter((l: any) => l.topic === topic);
    }
    if (difficulty) {
      filteredLessons = filteredLessons.filter((l: any) => l.difficulty === difficulty);
    }

    return HttpResponse.json({
      items: filteredLessons,
      pagination: {
        page,
        per_page: perPage,
        total_items: filteredLessons.length,
        total_pages: Math.ceil(filteredLessons.length / perPage),
      },
    });
  }),

  http.get('/grammar/lessons/:lessonId', () => {
    return HttpResponse.json(mockLesson);
  }),

  // Grammar reference handlers
  http.get('/grammar/reference/', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const perPage = parseInt(url.searchParams.get('per_page') || '10', 10);
    const query = url.searchParams.get('q') || undefined;
    const category = url.searchParams.get('category') as any || undefined;
    const difficulty = url.searchParams.get('difficulty') as any || undefined;

    let filteredReferences = mockReferences.items;
    if (query) {
      filteredReferences = filteredReferences.filter((r: any) =>
        r.title.toLowerCase().includes(query.toLowerCase())
      );
    }
    if (category) {
      filteredReferences = filteredReferences.filter((r: any) => r.category === category);
    }
    if (difficulty) {
      filteredReferences = filteredReferences.filter((r: any) => r.difficulty === difficulty);
    }

    return HttpResponse.json({
      items: filteredReferences,
      pagination: {
        page,
        per_page: perPage,
        total_items: filteredReferences.length,
        total_pages: Math.ceil(filteredReferences.length / perPage),
      },
    });
  }),

  // Fallback handler for any other requests
  http.get('*', ({ request }) => {
    const url = new URL(request.url);
    return HttpResponse.json(
      {
        detail: `Mock not implemented for ${url.pathname}`,
      },
      { status: 501 }
    );
  }),
];

export default handlers;
