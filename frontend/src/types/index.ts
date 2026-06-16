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

// ============================================================================
// Index Page / Landing Page Types (Issue #177)
// ============================================================================

/**
 * Props for FeatureCard component
 */
export interface FeatureCardProps {
  icon: string;          // Emoji or icon character
  title: string;        // Feature name
  description: string;   // Brief description
  ctaText: string;      // CTA button/link text
  onClick?: () => void; // Click handler (optional for disabled cards)
  disabled?: boolean;    // Whether card is disabled
  comingSoon?: boolean;  // Whether to show "Coming Soon" badge
}

/**
 * Props for QuickAccessSession component
 */
export interface QuickAccessSessionProps {
  session: SessionSummary; // From existing SessionSummary type
  onClick: (sessionId: string) => void; // Resume session handler
}

/**
 * Feature card configuration for the landing page
 */
export interface FeatureConfig {
  id: string;
  icon: string;
  title: string;
  description: string;
  ctaText: string;
  path?: string; // Navigation path for enabled features
  disabled?: boolean;
  comingSoon?: boolean;
}

// ============================================================================
// Vocabulary Types (Issue #67 - DeckBrowser Component)
// ============================================================================

/**
 * Sort options for deck browsing
 */
export type DeckSortOption = 
  | 'name-asc'
  | 'name-desc'
  | 'created-asc'
  | 'created-desc'
  | 'cards-asc'
  | 'cards-desc'
  | 'progress-asc'
  | 'progress-desc'

/**
 * Vocabulary deck summary (matches backend DeckSummary schema)
 * From schemas/vocabulary.py
 */
export interface DeckSummary {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  card_count: number;
}

/**
 * Vocabulary deck with progress information (client-side enrichment)
 */
export interface DeckWithProgress extends DeckSummary {
  learned_count: number;
  progress_percent: number;
  tags: string[]; // Aggregated tags from all cards in this deck
}

/**
 * Pagination info for deck lists (reuses existing PaginationInfo)
 */
export interface DeckPaginationInfo {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

/**
 * Response for GET /vocabulary/decks/ (list with pagination)
 * Matches DeckListResponse in schemas/vocabulary.py
 */
export interface DeckListResponse {
  decks: DeckSummary[];
  pagination: DeckPaginationInfo;
}

/**
 * Card summary for deck browsing (matches backend CardSummary schema)
 * From schemas/vocabulary.py
 */
export interface CardSummary {
  id: number;
  deck_id: number;
  card_id: string;
  front: string;
  back: string;
  example: string | null;
  tags: string[] | null;
  context: string | null;
  difficulty: number;
  next_review_date: string;
  interval: number;
  ease_factor: number;
  created_at: string;
  updated_at: string;
}

/**
 * Response for GET /vocabulary/decks/{id}/cards/ (list with pagination)
 * Matches CardListResponse in schemas/vocabulary.py
 */
export interface CardListResponse {
  cards: CardSummary[];
  pagination: DeckPaginationInfo;
}

// Component prop types for DeckBrowser

/**
 * Props for DeckCard component
 */
export interface DeckCardProps {
  deck: DeckWithProgress;
  onClick: (deckId: number) => void;
}

/**
 * Props for DeckSearch component
 */
export interface DeckSearchProps {
  searchQuery: string;
  tagFilter: string;
  sortBy: DeckSortOption;
  availableTags: string[];
  onSearch: (query: string) => void;
  onTagFilter: (tag: string) => void;
  onSort: (sortBy: DeckSortOption) => void;
  onClearFilters: () => void;
}

/**
 * Props for DeckBrowser component
 */
export interface DeckBrowserProps {
  // Optional initial filters
  initialSearch?: string;
  initialTag?: string;
  initialSort?: DeckSortOption;
}

// Vocabulary API response types

/**
 * Response for GET /vocabulary/decks/{id} (single deck)
 * Matches DeckResponse in schemas/vocabulary.py
 */
export interface DeckResponse extends DeckSummary {}

/**
 * Request body for POST /vocabulary/decks/
 * Matches DeckCreate in schemas/vocabulary.py
 */
export interface DeckCreateRequest {
  name: string;
  description?: string | null;
}

/**
 * Request body for POST /vocabulary/review/
 * Matches ReviewSubmit in schemas/vocabulary.py
 */
export interface ReviewSubmitRequest {
  card_id: number;
  deck_id: number;
  ease: number; // 1=Again, 2=Hard, 3=Good, 4=Easy
}

/**
 * Response for POST /vocabulary/review/
 * Matches ReviewResponse in schemas/vocabulary.py
 */
export interface ReviewResponse {
  success: boolean;
  message: string;
  next_review_date: string;
  new_interval: number;
  new_ease_factor: number;
}

/**
 * Card due for review (matches backend DueCardResponse schema)
 * From schemas/vocabulary.py
 */
export interface DueCard {
  id: number;
  deck_id: number;
  deck_name: string;
  card_id: string;
  front: string;
  back: string;
  next_review_date: string;
}

/**
 * Response for GET /vocabulary/due/ (cards due for review)
 * Matches DueCardsResponse in schemas/vocabulary.py
 */
export interface DueCardsResponse {
  cards: DueCard[];
  pagination: DeckPaginationInfo;
}

// ============================================================================
// Flashcard and ReviewSession Types (Issue #69)
// ============================================================================

/**
 * Data for a single flashcard, extracted from DueCard or CardSummary
 * Used by Flashcard component to display card content
 */
export interface CardData {
  id: number;
  deck_id: number;
  deck_name?: string;
  card_id: string;
  front: string;
  back: string;
  example?: string | null;
  next_review_date?: string;
}

/**
 * Rating values for spaced repetition (maps to SM-2 ease factor)
 * 1 = Again (card was forgotten)
 * 2 = Hard (card was recalled with difficulty)
 * 3 = Good (card was recalled correctly)
 * 4 = Easy (card was recalled easily)
 */
export type Rating = 1 | 2 | 3 | 4

/**
 * Rating button configuration for ReviewSession
 */
export interface RatingButton {
  label: string;      // Display text ("Again", "Hard", "Good", "Easy")
  value: Rating;     // Numeric rating (1-4)
  color: string;     // CSS color class or value
}

/**
 * Props for Flashcard component
 */
export interface FlashcardProps {
  card: CardData;
  flipped?: boolean;           // Controlled flip state (optional)
  onFlip?: (flipped: boolean) => void;  // Callback when flip state changes (optional)
}

/**
 * Statistics for session summary
 */
export interface SessionStats {
  totalCards: number;
  ratings: Record<string, number>;  // {"Again": 2, "Hard": 1, "Good": 3, "Easy": 1}
  completedAt: string;
}

/**
 * Props for ReviewSession component
 */
export interface ReviewSessionProps {
  deckId?: number;           // Optional: filter to specific deck
  onComplete?: (stats: SessionStats) => void;  // Callback when session completes
  onError?: (error: string) => void;  // Callback for API errors
}

// ============================================================================
// Deck Detail and Cards Page Types (Issue #201)
// ============================================================================

/**
 * Breadcrumb item for navigation
 */
export interface BreadcrumbItem {
  label: string;
  path?: string;  // Optional: if provided, clicking navigates to this path
}

/**
 * Props for Breadcrumb component
 */
export interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

/**
 * Sort options for card list in deck
 */
export type CardSortOption = 
  | 'front-asc'
  | 'front-desc'
  | 'back-asc'
  | 'back-desc'
  | 'difficulty-asc'
  | 'difficulty-desc'
  | 'next-review-asc'
  | 'next-review-desc'

/**
 * Card with metadata for display in deck cards list
 * Extends CardSummary with deck-specific display fields
 */
export interface CardForDisplay extends CardSummary {
  deck_name?: string;  // Added for display purposes
}

/**
 * Props for DeckDetailPage component
 */
export interface DeckDetailPageProps {
  // No props needed - deck ID comes from URL params
}

/**
 * Deck detail with cards for the detail page
 */
export interface DeckDetail extends DeckSummary {
  cards?: CardSummary[];  // Cards for preview on detail page
}

/**
 * Props for DeckCardsPage component
 */
export interface DeckCardsPageProps {
  // No props needed - deck ID comes from URL params
}

/**
 * Card list state for filtering and sorting
 */
export interface CardListState {
  searchQuery: string;
  tagFilter: string;
  difficultyFilter: string;
  sortBy: CardSortOption;
}

/**
 * Sort options for card list with labels
 */
export const CARD_SORT_OPTIONS: { value: CardSortOption; label: string }[] = [
  { value: 'front-asc', label: 'Front (A-Z)' },
  { value: 'front-desc', label: 'Front (Z-A)' },
  { value: 'back-asc', label: 'Back (A-Z)' },
  { value: 'back-desc', label: 'Back (Z-A)' },
  { value: 'difficulty-asc', label: 'Difficulty (Easy-Hard)' },
  { value: 'difficulty-desc', label: 'Difficulty (Hard-Easy)' },
  { value: 'next-review-asc', label: 'Next Review (Soon-Later)' },
  { value: 'next-review-desc', label: 'Next Review (Later-Soon)' },
];
