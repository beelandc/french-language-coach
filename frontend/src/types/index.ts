// API Type Definitions for French Language Coach

// Difficulty types
export type Difficulty = 'beginner' | 'intermediate' | 'advanced'

// Scenario types
export interface Scenario {
  id: string
  name: string
  description: string
}

// Message types - matches backend schemas
// Backend Message only has role and content, but we add client-side metadata
export type MessageRole = 'user' | 'assistant'

export interface Message {
  id: string
  session_id: string
  role: MessageRole
  content: string
  created_at: string
}

// Backend message format (what comes from API)
export interface BackendMessage {
  role: string
  content: string
}

// Session types - id is integer from backend, but we treat as string for consistency
export interface Session {
  id: string
  scenario_id: string
  difficulty?: Difficulty
  created_at: string
  ended_at: string | null
  messages: Message[]
  feedback: Feedback | null
  // Session locking fields for preventing concurrent access
  is_locked: boolean
  locked_at: string | null
  locked_by: string | null
}

// Correction type for feedback
export interface Correction {
  original: string
  corrected: string
  explanation: string
}

// Feedback types
export interface Feedback {
  grammar_score: number
  vocabulary_score: number
  fluency_score: number
  overall_score: number
  strengths: string[]
  focus_area: string
  example_corrections: Correction[]
}

// API Response types
export interface CreateSessionResponse {
  id: string
  scenario_id: string
  difficulty?: Difficulty
  created_at: string
}

// Session lock response types
export interface SessionLockResponse {
  id: string
  is_locked: boolean
  locked_at: string | null
  locked_by: string | null
}

export interface SendMessageResponse {
  role: MessageRole
  content: string
  session_id: string
}

export interface ApiError {
  detail: string
}

// Component prop types
export interface DifficultySelectorProps {
  onDifficultyChange: (difficulty: Difficulty) => void
  defaultDifficulty?: Difficulty
}

export interface ScenarioCardProps {
  scenario: Scenario
  onClick: () => void
}

export interface MessageBubbleProps {
  message: Message
}

export interface ChatHeaderProps {
  scenarioName: string
  onBack: () => void
  onEndSession: () => void
  disabled: boolean
}

export interface ScoreCardProps {
  label: string
  value: number
}

export interface CorrectionItemProps {
  correction: Correction
}

export interface ChatInterfaceProps {
  sessionId: string
}

export interface FeedbackViewProps {
  sessionId: string
}

export interface SessionDetailProps {
  sessionId: string
}

// Deprecated: Use MessageBubbleProps instead
export interface MessageProps {
  message: Message
}

// Context types (re-exported from hooks for convenience)
export interface SessionsContextType {
  sessions: Session[]
  currentSessionId: string | null
  currentScenarioId: string | null
  sessionEnded: boolean
  isLoading: boolean
  error: string | null
  createSession: (scenarioId: string, difficulty?: Difficulty) => Promise<string>
  sendMessage: (sessionId: string, content: string) => Promise<Message>
  getFeedback: (sessionId: string, forceRefresh?: boolean) => Promise<Feedback | null>
  endSession: () => void
  setCurrentSessionId: (id: string | null) => void
  clearError: () => void
}

// Session History types
export interface SessionSummary {
  id: string
  scenario_id: string
  scenario_name: string
  difficulty: string
  created_at: string
  ended_at: string | null
  overall_score: number | null
  // Session locking fields
  is_locked: boolean
  locked_at: string | null
  locked_by: string | null
}

export interface PaginationInfo {
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface SessionListResponse {
  sessions: SessionSummary[]
  pagination: PaginationInfo
}

// Session History component prop types
export interface SessionHistoryProps {
  onSessionClick: (sessionId: string) => void
}

export interface SessionHistoryItemProps {
  session: SessionSummary
  onClick: (sessionId: string) => void
  onDelete?: (sessionId: string) => void
}

// Confirmation Modal types
export interface ConfirmationModalProps {
  isOpen: boolean
  onCancel: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isLoading?: boolean
}

// Lesson types for Grammar Lessons (Phase 2)
// Matches backend schemas in schemas/grammar_lesson.py and schemas/grammar.py

export type Difficulty = 'beginner' | 'intermediate' | 'advanced'

// Section within a grammar lesson
export interface LessonSection {
  title: string
  content: string
  examples: string[]
}

// Full lesson with all content
export interface Lesson {
  id: string
  title: string
  topic: string
  difficulty: Difficulty
  sections: LessonSection[]
}

// Lesson summary for listings (without full content)
export interface LessonSummary {
  id: string
  title: string
  topic: string
  difficulty: Difficulty
}

// Pagination info (matches backend PaginationInfo)
export interface PaginationInfo {
  total: number
  page: number
  per_page: number
  total_pages: number
}

// Response for GET /grammar/lessons/ (list with pagination)
export interface LessonListResponse {
  lessons: LessonSummary[]
  pagination: PaginationInfo
}

// Response for GET /grammar/lessons/{id} (single lesson)
export interface LessonResponse extends Lesson {}

// Props for LessonCard component
export interface LessonCardProps {
  lesson: LessonSummary
  onClick: (lessonId: string) => void
}

// Props for LessonSearch component
export interface LessonSearchProps {
  onSearch: (query: string) => void
  onTopicFilter: (topic: string) => void
  onDifficultyFilter: (difficulty: Difficulty | '') => void
  searchQuery: string
  topicFilter: string
  difficultyFilter: Difficulty | ''
}

// Props for LessonBrowser component
export interface LessonBrowserProps {
  // Optional initial filters
  initialDifficulty?: Difficulty
  initialTopic?: string
  initialSearch?: string
}

// Props for LessonDetail component
export interface LessonDetailProps {
  lesson: Lesson
}

// Context type for lesson-related state (if needed in future)
export interface LessonsContextType {
  lessons: LessonSummary[]
  isLoading: boolean
  error: string | null
  pagination: PaginationInfo
  fetchLessons: (page?: number, perPage?: number, topic?: string, difficulty?: Difficulty) => Promise<void>
  searchLessons: (query: string) => Promise<void>
}

// ============================================================================
// Grammar Reference Types (Phase 2)
// Matches backend schemas in schemas/grammar_reference.py
// ============================================================================

/**
 * Valid categories for grammar reference entries.
 * Matches GrammarReferenceCategory enum in schemas/grammar_reference.py
 */
export type ReferenceCategory =
  | 'Verbs'
  | 'Nouns'
  | 'Adjectives'
  | 'Adverbs'
  | 'Pronouns'
  | 'Prepositions'
  | 'Conjunctions'
  | 'Articles'
  | 'Sentence Structure'
  | 'Punctuation'
  | 'Other'

/**
 * A grammar reference entry for quick lookup.
 * Matches GrammarReference model in schemas/grammar_reference.py
 */
export interface GrammarReference {
  id: string
  term: string
  category: ReferenceCategory
  difficulty: Difficulty
  definition: string
  examples: string[]
  common_pitfalls: string[]
  related_terms: string[]
}

/**
 * Summary of a grammar reference entry for listing purposes.
 * Matches ReferenceSummary in schemas/grammar.py
 */
export interface ReferenceSummary {
  id: string
  term: string
  category: ReferenceCategory
  difficulty: Difficulty
  definition: string
}

/**
 * Response for GET /grammar/reference/ (list with pagination)
 * Matches ReferenceListResponse in schemas/grammar.py
 */
export interface ReferenceListResponse {
  references: GrammarReference[]
  pagination: PaginationInfo
}

/**
 * Response for a single grammar reference entry.
 * Matches ReferenceResponse in schemas/grammar.py
 */
export interface ReferenceResponse extends GrammarReference {}

// Props for ReferenceCard component
export interface ReferenceCardProps {
  reference: GrammarReference
  onClick?: (referenceId: string) => void
}

// Props for ReferenceSearch component
export interface ReferenceSearchProps {
  onSearch: (query: string) => void
  onCategoryFilter: (category: ReferenceCategory | '') => void
  onDifficultyFilter: (difficulty: Difficulty | '') => void
  searchQuery: string
  categoryFilter: ReferenceCategory | ''
  difficultyFilter: Difficulty | ''
}

// ============================================================================
// Exercise Types (Phase 2)
// Matches backend schemas in schemas/grammar_exercise.py
// ============================================================================

/**
 * Valid exercise types for grammar practice exercises.
 * Matches ExerciseType enum in schemas/grammar_exercise.py
 */
export type ExerciseType =
  | 'fill-in-the-blank'
  | 'multiple-choice'
  | 'translation'
  | 'conjugation'
  | 'sentence-transformation'

/**
 * Base interface for all grammar practice exercises.
 * Contains fields common to all exercise types.
 * Matches ExerciseBase in schemas/grammar_exercise.py
 */
export interface ExerciseBase {
  id: string
  type: ExerciseType
  prompt: string
  correct_answer: string | null
  correct_answers?: string[] | null
  topic: string
  difficulty: Difficulty
  hint?: string | null
}

/**
 * Type-specific fields for multiple-choice exercises.
 * Matches MultipleChoiceExercise in schemas/grammar_exercise.py
 */
export interface MultipleChoiceExercise extends ExerciseBase {
  type: 'multiple-choice'
  options: string[]
}

/**
 * Type-specific fields for fill-in-the-blank exercises.
 * Matches FillInTheBlankExercise in schemas/grammar_exercise.py
 */
export interface FillInTheBlankExercise extends ExerciseBase {
  type: 'fill-in-the-blank'
}

/**
 * Type-specific fields for translation exercises.
 * Matches TranslationExerciseModel in schemas/grammar_exercise.py
 */
export interface TranslationExercise extends ExerciseBase {
  type: 'translation'
  source_language: string
  target_language: string
}

/**
 * Type-specific fields for conjugation exercises.
 * Matches ConjugationExerciseModel in schemas/grammar_exercise.py
 */
export interface ConjugationExercise extends ExerciseBase {
  type: 'conjugation'
  verb: string
  tense: string
  pronoun: string
}

/**
 * Type-specific fields for sentence transformation exercises.
 * Matches SentenceTransformationExerciseModel in schemas/grammar_exercise.py
 */
export interface SentenceTransformationExercise extends ExerciseBase {
  type: 'sentence-transformation'
  transformation_type: string
}

/**
 * Union type for all exercise types.
 * Discriminated union on the 'type' field.
 * Matches Exercise in schemas/grammar_exercise.py
 */
export type Exercise =
  | FillInTheBlankExercise
  | MultipleChoiceExercise
  | TranslationExercise
  | ConjugationExercise
  | SentenceTransformationExercise

/**
 * Response for listing exercises with pagination.
 * Similar pattern to LessonListResponse
 */
export interface ExerciseListResponse {
  exercises: Exercise[]
  pagination: PaginationInfo
}

/**
 * Props for Exercise component
 */
export interface ExerciseProps {
  exercise: Exercise
  onAnswerSubmit: (exerciseId: string, userAnswer: string) => void
  score?: number
  total?: number
}

/**
 * Props for individual exercise type components
 */
export interface FillInTheBlankExerciseProps {
  exercise: FillInTheBlankExercise
  onAnswerChange: (answer: string) => void
  onSubmit: () => void
  userAnswer: string
  feedback?: string
  isCorrect?: boolean
}

export interface MultipleChoiceExerciseProps {
  exercise: MultipleChoiceExercise
  onAnswerChange: (answer: string) => void
  onSubmit: () => void
  selectedAnswer: string | null
  feedback?: string
  isCorrect?: boolean
}

export interface TranslationExerciseProps {
  exercise: TranslationExercise
  onAnswerChange: (answer: string) => void
  onSubmit: () => void
  userAnswer: string
  feedback?: string
  isCorrect?: boolean
}

export interface ConjugationExerciseProps {
  exercise: ConjugationExercise
  onAnswerChange: (answer: string) => void
  onSubmit: () => void
  userAnswer: string
  feedback?: string
  isCorrect?: boolean
}

export interface SentenceTransformationExerciseProps {
  exercise: SentenceTransformationExercise
  onAnswerChange: (answer: string) => void
  onSubmit: () => void
  userAnswer: string
  feedback?: string
  isCorrect?: boolean
}

/**
 * Props for ExercisePage component
 */
export interface ExercisePageProps {
  exerciseId: string
}

/**
 * Props for ReferencePage component
 */
export interface ReferencePageProps {
  // Page-level props if needed
}

/**
 * State for managing exercise sessions
 */
export interface ExerciseSession {
  currentExerciseIndex: number
  exercises: Exercise[]
  score: number
  total: number
  completed: boolean
}
