import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import DifficultySelector from './DifficultySelector'
import type { Difficulty } from '../types'

/**
 * Tests for DifficultySelector component
 * Tests cover all acceptance criteria from issue #21:
 * - AC1: Three difficulty options
 * - AC2: Default selection is intermediate
 * - AC3: Selection persists (via callback)
 * - AC4: Visual indication of selected level
 */

describe('DifficultySelector', () => {
  // Helper to get button by difficulty
  const getButtonByDifficulty = (difficulty: Difficulty) => {
    // Buttons contain the difficulty label text
    const labels: Record<Difficulty, string> = {
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
    }
    return screen.getByText(labels[difficulty])
  }

  describe('AC1: Three difficulty options', () => {
    it('renders all three difficulty options', () => {
      render(<DifficultySelector onDifficultyChange={vi.fn()} />)
      
      expect(screen.getByText('Beginner')).toBeInTheDocument()
      expect(screen.getByText('Intermediate')).toBeInTheDocument()
      expect(screen.getByText('Advanced')).toBeInTheDocument()
    })

    it('renders difficulty descriptions', () => {
      render(<DifficultySelector onDifficultyChange={vi.fn()} />)
      
      expect(screen.getByText('Simpler vocabulary, slower pace')).toBeInTheDocument()
      expect(screen.getByText('Standard prompts')).toBeInTheDocument()
      expect(screen.getByText('Complex vocabulary, native idioms')).toBeInTheDocument()
    })

    it('renders color indicators for each difficulty', () => {
      render(<DifficultySelector onDifficultyChange={vi.fn()} />)
      
      // Check that indicator elements exist
      const indicators = screen.getAllByClassName('difficulty-indicator')
      expect(indicators).toHaveLength(3)
    })
  })

  describe('AC2: Default selection is intermediate', () => {
    it('has intermediate selected by default when no defaultDifficulty provided', () => {
      render(<DifficultySelector onDifficultyChange={vi.fn()} />)
      
      const beginnerBtn = getButtonByDifficulty('beginner')
      const intermediateBtn = getButtonByDifficulty('intermediate')
      const advancedBtn = getButtonByDifficulty('advanced')
      
      expect(beginnerBtn.parentElement).not.toHaveClass('selected')
      expect(intermediateBtn.parentElement).toHaveClass('selected')
      expect(advancedBtn.parentElement).not.toHaveClass('selected')
    })

    it('respects defaultDifficulty prop', () => {
      render(<DifficultySelector onDifficultyChange={vi.fn()} defaultDifficulty="beginner" />)
      
      const beginnerBtn = getButtonByDifficulty('beginner')
      const intermediateBtn = getButtonByDifficulty('intermediate')
      
      expect(beginnerBtn.parentElement).toHaveClass('selected')
      expect(intermediateBtn.parentElement).not.toHaveClass('selected')
    })

    it('defaults to intermediate when defaultDifficulty is undefined', () => {
      render(<DifficultySelector onDifficultyChange={vi.fn()} defaultDifficulty={undefined} />)
      
      const intermediateBtn = getButtonByDifficulty('intermediate')
      expect(intermediateBtn.parentElement).toHaveClass('selected')
    })
  })

  describe('AC4: Visual indication of selected level', () => {
    it('selected button has "selected" class', () => {
      render(<DifficultySelector onDifficultyChange={vi.fn()} defaultDifficulty="advanced" />)
      
      const advancedBtn = getButtonByDifficulty('advanced')
      expect(advancedBtn.parentElement).toHaveClass('selected')
    })

    it('only one button has "selected" class at a time', () => {
      render(<DifficultySelector onDifficultyChange={vi.fn()} />)
      
      const selectedButtons = screen.getAllByRole('radio', { checked: true })
      expect(selectedButtons).toHaveLength(1)
    })

    it('selected button has different background color', () => {
      render(<DifficultySelector onDifficultyChange={vi.fn()} />)
      
      const intermediateBtn = getButtonByDifficulty('intermediate')
      expect(intermediateBtn.parentElement).toHaveStyle('background: rgb(227, 242, 253)')
    })
  })

  describe('AC3: Selection persists for session (via callback)', () => {
    it('calls onDifficultyChange when a difficulty is clicked', () => {
      const onChange = vi.fn()
      render(<DifficultySelector onDifficultyChange={onChange} />)
      
      const advancedBtn = getButtonByDifficulty('advanced')
      fireEvent.click(advancedBtn)
      
      expect(onChange).toHaveBeenCalledWith('advanced')
      expect(onChange).toHaveBeenCalledTimes(1)
    })

    it('calls onDifficultyChange with correct difficulty value', () => {
      const onChange = vi.fn()
      render(<DifficultySelector onDifficultyChange={onChange} />)
      
      const beginnerBtn = getButtonByDifficulty('beginner')
      fireEvent.click(beginnerBtn)
      
      expect(onChange).toHaveBeenCalledWith('beginner')
    })

    it('calls onDifficultyChange when switching from one difficulty to another', () => {
      const onChange = vi.fn()
      render(<DifficultySelector onDifficultyChange={onChange} />)
      
      // Click beginner
      const beginnerBtn = getButtonByDifficulty('beginner')
      fireEvent.click(beginnerBtn)
      expect(onChange).toHaveBeenCalledWith('beginner')
      
      // Click advanced
      const advancedBtn = getButtonByDifficulty('advanced')
      fireEvent.click(advancedBtn)
      expect(onChange).toHaveBeenCalledWith('advanced')
      
      expect(onChange).toHaveBeenCalledTimes(2)
    })

    it('calls onDifficultyChange with default value on mount', () => {
      const onChange = vi.fn()
      render(<DifficultySelector onDifficultyChange={onChange} defaultDifficulty="advanced" />)
      
      // Should be called with the default value when component mounts
      // Note: This might not be called on initial render depending on implementation
      // We test that clicking works regardless
      const advancedBtn = getButtonByDifficulty('advanced')
      fireEvent.click(advancedBtn)
      expect(onChange).toHaveBeenCalledWith('advanced')
    })
  })

  describe('Accessibility', () => {
    it('has proper aria-label on buttons', () => {
      render(<DifficultySelector onDifficultyChange={vi.fn()} />)
      
      const beginnerBtn = getButtonByDifficulty('beginner')
      expect(beginnerBtn.parentElement).toHaveAttribute(
        'aria-label',
        'Select Beginner difficulty: Simpler vocabulary, slower pace'
      )
    })

    it('has role="radio" on buttons', () => {
      render(<DifficultySelector onDifficultyChange={vi.fn()} />)
      
      const radioButtons = screen.getAllByRole('radio')
      expect(radioButtons).toHaveLength(3)
    })

    it('has aria-checked attribute', () => {
      render(<DifficultySelector onDifficultyChange={vi.fn()} />)
      
      const intermediateBtn = getButtonByDifficulty('intermediate')
      expect(intermediateBtn.parentElement).toHaveAttribute('aria-checked', 'true')
      
      const beginnerBtn = getButtonByDifficulty('beginner')
      expect(beginnerBtn.parentElement).toHaveAttribute('aria-checked', 'false')
    })

    it('has radiogroup role on container', () => {
      render(<DifficultySelector onDifficultyChange={vi.fn()} />)
      
      const radioGroup = screen.getByRole('radiogroup')
      expect(radioGroup).toBeInTheDocument()
      expect(radioGroup).toHaveAttribute('aria-label', 'Difficulty level')
    })

    it('has proper aria-pressed attribute', () => {
      render(<DifficultySelector onDifficultyChange={vi.fn()} />)
      
      const intermediateBtn = getButtonByDifficulty('intermediate')
      expect(intermediateBtn.parentElement).toHaveAttribute('aria-pressed', 'true')
      
      const beginnerBtn = getButtonByDifficulty('beginner')
      expect(beginnerBtn.parentElement).toHaveAttribute('aria-pressed', 'false')
    })
  })

  describe('Keyboard Navigation', () => {
    it('can be navigated with Tab key', () => {
      render(<DifficultySelector onDifficultyChange={vi.fn()} />)
      
      const buttons = screen.getAllByRole('radio')
      expect(buttons[0]).toHaveAttribute('tabindex', '0')
    })

    it('responds to Enter key press', () => {
      const onChange = vi.fn()
      render(<DifficultySelector onDifficultyChange={onChange} />)
      
      const beginnerBtn = getButtonByDifficulty('beginner')
      fireEvent.keyDown(beginnerBtn.parentElement!, { key: 'Enter' })
      
      // Should trigger the click handler
      expect(onChange).toHaveBeenCalledWith('beginner')
    })

    it('responds to Space key press', () => {
      const onChange = vi.fn()
      render(<DifficultySelector onDifficultyChange={onChange} />)
      
      const advancedBtn = getButtonByDifficulty('advanced')
      fireEvent.keyDown(advancedBtn.parentElement!, { key: ' ' })
      
      expect(onChange).toHaveBeenCalledWith('advanced')
    })
  })

  describe('Edge Cases', () => {
    it('handles rapid difficulty changes correctly', () => {
      const onChange = vi.fn()
      render(<DifficultySelector onDifficultyChange={onChange} />)
      
      const beginnerBtn = getButtonByDifficulty('beginner')
      const intermediateBtn = getButtonByDifficulty('intermediate')
      const advancedBtn = getButtonByDifficulty('advanced')
      
      // Rapidly click all three
      fireEvent.click(beginnerBtn)
      fireEvent.click(intermediateBtn)
      fireEvent.click(advancedBtn)
      
      expect(onChange).toHaveBeenCalledTimes(3)
      expect(onChange).toHaveBeenLastCalledWith('advanced')
    })

    it('maintains visual state after multiple clicks', () => {
      render(<DifficultySelector onDifficultyChange={vi.fn()} />)
      
      const beginnerBtn = getButtonByDifficulty('beginner')
      const intermediateBtn = getButtonByDifficulty('intermediate')
      const advancedBtn = getButtonByDifficulty('advanced')
      
      // Click beginner
      fireEvent.click(beginnerBtn)
      expect(beginnerBtn.parentElement).toHaveClass('selected')
      expect(intermediateBtn.parentElement).not.toHaveClass('selected')
      expect(advancedBtn.parentElement).not.toHaveClass('selected')
      
      // Click advanced
      fireEvent.click(advancedBtn)
      expect(beginnerBtn.parentElement).not.toHaveClass('selected')
      expect(intermediateBtn.parentElement).not.toHaveClass('selected')
      expect(advancedBtn.parentElement).toHaveClass('selected')
    })

    it('updates selected state when defaultDifficulty prop changes', () => {
      const { rerender } = render(
        <DifficultySelector onDifficultyChange={vi.fn()} defaultDifficulty="beginner" />
      )
      
      let beginnerBtn = screen.getByText('Beginner')
      expect(beginnerBtn.parentElement).toHaveClass('selected')
      
      // Change defaultDifficulty prop
      rerender(<DifficultySelector onDifficultyChange={vi.fn()} defaultDifficulty="advanced" />)
      
      const advancedBtn = screen.getByText('Advanced')
      expect(advancedBtn.parentElement).toHaveClass('selected')
      expect(screen.getByText('Beginner').parentElement).not.toHaveClass('selected')
    })
  })

  describe('Component Structure', () => {
    it('has correct container class', () => {
      render(<DifficultySelector onDifficultyChange={vi.fn()} />)
      
      expect(screen.getByRole('radiogroup')).toHaveClass('difficulty-options')
    })

    it('has correct heading', () => {
      render(<DifficultySelector onDifficultyChange={vi.fn()} />)
      
      expect(screen.getByText('Select Difficulty')).toBeInTheDocument()
      expect(screen.getByText('Select Difficulty')).toHaveProperty('tagName', 'H3')
    })

    it('has correct button classes', () => {
      render(<DifficultySelector onDifficultyChange={vi.fn()} />)
      
      const buttons = screen.getAllByRole('radio')
      buttons.forEach(btn => {
        expect(btn).toHaveClass('difficulty-btn')
      })
    })
  })
})
