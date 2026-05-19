import { useState, useEffect } from 'react'
import type { Difficulty, DifficultySelectorProps } from '../types'

/**
 * DifficultySelector component allows users to select a difficulty level
 * for conversation scenarios.
 * 
 * Displays three difficulty options: Beginner, Intermediate, Advanced
 * with visual indication of the selected level.
 * 
 * @component
 */
export default function DifficultySelector({
  onDifficultyChange,
  defaultDifficulty = 'intermediate',
}: DifficultySelectorProps) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(defaultDifficulty)

  // Notify parent when difficulty changes
  useEffect(() => {
    onDifficultyChange(selectedDifficulty)
  }, [selectedDifficulty, onDifficultyChange])

  // Initialize with default value
  useEffect(() => {
    setSelectedDifficulty(defaultDifficulty)
  }, [defaultDifficulty])

  const handleDifficultyClick = (difficulty: Difficulty) => {
    setSelectedDifficulty(difficulty)
  }

  const difficultyLabels: Record<Difficulty, string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
  }

  const difficultyDescriptions: Record<Difficulty, string> = {
    beginner: 'Simpler vocabulary, slower pace',
    intermediate: 'Standard prompts',
    advanced: 'Complex vocabulary, native idioms',
  }

  const difficultyColors: Record<Difficulty, string> = {
    beginner: '#4caf50', // Green
    intermediate: '#ff9800', // Orange
    advanced: '#f44336', // Red
  }

  return (
    <div className="difficulty-selector">
      <h3>Select Difficulty</h3>
      <div className="difficulty-options" role="radiogroup" aria-label="Difficulty level">
        {(['beginner', 'intermediate', 'advanced'] as Difficulty[]).map((difficulty) => (
          <button
            key={difficulty}
            type="button"
            className={`difficulty-btn ${difficulty} ${selectedDifficulty === difficulty ? 'selected' : ''}`}
            onClick={() => handleDifficultyClick(difficulty)}
            aria-label={`Select ${difficultyLabels[difficulty]} difficulty: ${difficultyDescriptions[difficulty]}`}
            aria-pressed={selectedDifficulty === difficulty}
            role="radio"
            aria-checked={selectedDifficulty === difficulty}
          >
            <span className="difficulty-label">{difficultyLabels[difficulty]}</span>
            <span className="difficulty-description">{difficultyDescriptions[difficulty]}</span>
            <span 
              className="difficulty-indicator" 
              style={{ backgroundColor: difficultyColors[difficulty] }}
            />
          </button>
        ))}
      </div>
    </div>
  )
}
