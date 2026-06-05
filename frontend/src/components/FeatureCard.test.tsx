import { render, screen, fireEvent } from '@testing-library/react'
import FeatureCard from './FeatureCard'

describe('FeatureCard Component', () => {
  const defaultProps = {
    icon: '💬',
    title: 'Test Feature',
    description: 'This is a test feature',
    ctaText: 'Go Now →',
  }

  describe('Rendering', () => {
    it('renders with all required props', () => {
      render(<FeatureCard {...defaultProps} />)
      
      expect(screen.getByText('💬')).toBeInTheDocument()
      expect(screen.getByText('Test Feature')).toBeInTheDocument()
      expect(screen.getByText('This is a test feature')).toBeInTheDocument()
      expect(screen.getByText('Go Now →')).toBeInTheDocument()
    })

    it('renders with coming soon badge when comingSoon is true', () => {
      render(<FeatureCard {...defaultProps} comingSoon={true} />)
      
      expect(screen.getByText('Coming Soon')).toBeInTheDocument()
    })

    it('has correct data-testid', () => {
      render(<FeatureCard {...defaultProps} />)
      
      expect(screen.getByTestId('feature-card')).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('calls onClick when clicked and not disabled', () => {
      const mockOnClick = jest.fn()
      render(<FeatureCard {...defaultProps} onClick={mockOnClick} />)
      
      const card = screen.getByTestId('feature-card')
      fireEvent.click(card)
      
      expect(mockOnClick).toHaveBeenCalledTimes(1)
    })

    it('does not call onClick when disabled', () => {
      const mockOnClick = jest.fn()
      render(<FeatureCard {...defaultProps} onClick={mockOnClick} disabled={true} />)
      
      const card = screen.getByTestId('feature-card')
      fireEvent.click(card)
      
      expect(mockOnClick).not.toHaveBeenCalled()
    })

    it('calls onClick when Enter key is pressed', () => {
      const mockOnClick = jest.fn()
      render(<FeatureCard {...defaultProps} onClick={mockOnClick} />)
      
      const card = screen.getByTestId('feature-card')
      fireEvent.keyDown(card, { key: 'Enter' })
      
      expect(mockOnClick).toHaveBeenCalledTimes(1)
    })

    it('calls onClick when Space key is pressed', () => {
      const mockOnClick = jest.fn()
      render(<FeatureCard {...defaultProps} onClick={mockOnClick} />)
      
      const card = screen.getByTestId('feature-card')
      fireEvent.keyDown(card, { key: ' ' })
      
      expect(mockOnClick).toHaveBeenCalledTimes(1)
    })

    it('does not call onClick on key press when disabled', () => {
      const mockOnClick = jest.fn()
      render(<FeatureCard {...defaultProps} onClick={mockOnClick} disabled={true} />)
      
      const card = screen.getByTestId('feature-card')
      fireEvent.keyDown(card, { key: 'Enter' })
      
      expect(mockOnClick).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('has role="button" when onClick is provided', () => {
      render(<FeatureCard {...defaultProps} onClick={jest.fn()} />)
      
      const card = screen.getByTestId('feature-card')
      expect(card).toHaveAttribute('role', 'button')
    })

    it('has tabIndex=0 when not disabled', () => {
      render(<FeatureCard {...defaultProps} onClick={jest.fn()} />)
      
      const card = screen.getByTestId('feature-card')
      expect(card).toHaveAttribute('tabindex', '0')
    })

    it('has tabIndex=-1 when disabled', () => {
      render(<FeatureCard {...defaultProps} onClick={jest.fn()} disabled={true} />)
      
      const card = screen.getByTestId('feature-card')
      expect(card).toHaveAttribute('tabindex', '-1')
    })

    it('has aria-disabled="true" when disabled', () => {
      render(<FeatureCard {...defaultProps} onClick={jest.fn()} disabled={true} />)
      
      const card = screen.getByTestId('feature-card')
      expect(card).toHaveAttribute('aria-disabled', 'true')
    })

    it('has aria-label with title', () => {
      render(<FeatureCard {...defaultProps} onClick={jest.fn()} />)
      
      const card = screen.getByTestId('feature-card')
      expect(card).toHaveAttribute('aria-label', 'Test Feature')
    })

    it('includes "coming soon" in aria-label when comingSoon is true', () => {
      render(<FeatureCard {...defaultProps} onClick={jest.fn()} comingSoon={true} />)
      
      const card = screen.getByTestId('feature-card')
      expect(card).toHaveAttribute('aria-label', 'Test Feature, coming soon')
    })
  })

  describe('CTA Button', () => {
    it('renders CTA button when not disabled and not coming soon', () => {
      render(<FeatureCard {...defaultProps} onClick={jest.fn()} />)
      
      const button = screen.getByText('Go Now →')
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('btn-primary')
    })

    it('does not render CTA button when comingSoon is true', () => {
      render(<FeatureCard {...defaultProps} comingSoon={true} />)
      
      expect(screen.queryByText('Go Now →')).not.toBeInTheDocument()
    })

    it('renders disabled CTA text when disabled but not comingSoon', () => {
      render(<FeatureCard {...defaultProps} disabled={true} />)
      
      const disabledCta = screen.getByText('Go Now →')
      expect(disabledCta).toBeInTheDocument()
      expect(disabledCta).toHaveClass('feature-card-cta-disabled')
    })
  })
})
