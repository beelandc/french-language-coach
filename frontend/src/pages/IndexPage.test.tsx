import { render, screen, fireEvent } from '@testing-library/react'
import IndexPage from './IndexPage'

// Mock useNavigate
const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

describe('IndexPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders HeroSection', () => {
      render(<IndexPage />)
      
      expect(screen.getByTestId('hero-section')).toBeInTheDocument()
      expect(screen.getByText('Welcome to French Language Coach')).toBeInTheDocument()
    })

    it('renders app description from VISION.md', () => {
      render(<IndexPage />)
      
      const description = screen.getByText(/comprehensive French language learning platform/)
      expect(description).toBeInTheDocument()
    })

    it('renders FeatureCardsSection', () => {
      render(<IndexPage />)
      
      expect(screen.getByTestId('feature-cards-section')).toBeInTheDocument()
    })

    it('renders all 5 feature cards', () => {
      render(<IndexPage />)
      
      expect(screen.getByTestId('feature-card-conversation')).toBeInTheDocument()
      expect(screen.getByTestId('feature-card-lessons')).toBeInTheDocument()
      expect(screen.getByTestId('feature-card-reference')).toBeInTheDocument()
      expect(screen.getByTestId('feature-card-exercises')).toBeInTheDocument()
      expect(screen.getByTestId('feature-card-vocabulary')).toBeInTheDocument()
    })

    it('renders feature card titles', () => {
      render(<IndexPage />)
      
      expect(screen.getByText('Conversation Practice')).toBeInTheDocument()
      expect(screen.getByText('Grammar Lessons')).toBeInTheDocument()
      expect(screen.getByText('Grammar Reference')).toBeInTheDocument()
      expect(screen.getByText('Grammar Exercises')).toBeInTheDocument()
      expect(screen.getByText('Vocabulary Flashcards')).toBeInTheDocument()
    })

    it('Vocabulary Flashcards card shows Coming Soon', () => {
      render(<IndexPage />)
      
      const vocabCard = screen.getByTestId('feature-card-vocabulary')
      expect(vocabCard).toHaveTextContent('Coming Soon')
    })

    it('does not render the Quick Access / Recent Sessions section (moved to ScenarioPage)', () => {
      render(<IndexPage />)
      
      expect(screen.queryByTestId('quick-access-section')).not.toBeInTheDocument()
      expect(screen.queryByTestId('view-all-sessions-btn')).not.toBeInTheDocument()
      expect(screen.queryByText('Recent Sessions')).not.toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    it('navigates to /lessons when Grammar Lessons card is clicked', () => {
      render(<IndexPage />)
      
      const card = screen.getByTestId('feature-card-lessons')
      fireEvent.click(card)
      
      expect(mockNavigate).toHaveBeenCalledWith('/lessons')
    })

    it('navigates to /reference when Grammar Reference card is clicked', () => {
      render(<IndexPage />)
      
      const card = screen.getByTestId('feature-card-reference')
      fireEvent.click(card)
      
      expect(mockNavigate).toHaveBeenCalledWith('/reference')
    })

    it('navigates to /exercises when Grammar Exercises card is clicked', () => {
      render(<IndexPage />)
      
      const card = screen.getByTestId('feature-card-exercises')
      fireEvent.click(card)
      
      expect(mockNavigate).toHaveBeenCalledWith('/exercises')
    })

    it('does not navigate when Vocabulary Flashcards card is clicked (disabled)', () => {
      render(<IndexPage />)
      
      const card = screen.getByTestId('feature-card-vocabulary')
      fireEvent.click(card)
      
      // Should not call navigate since it's disabled
      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('has correct data-testid for the page', () => {
      render(<IndexPage />)
      
      expect(screen.getByTestId('index-page')).toBeInTheDocument()
    })
  })
})
