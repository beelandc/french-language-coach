/**
 * SentenceTransformationExercise Component
 * 
 * Displays a sentence transformation exercise where the user transforms a sentence
 * (e.g., from affirmative to negative, or from present to past tense).
 */

import React from 'react'
import type { SentenceTransformationExerciseProps } from '../../types/index'

/**
 * SentenceTransformationExercise component - text input for sentence transformation exercises
 * 
 * @param props - Component props
 * @param props.exercise - The sentence transformation exercise to display
 * @param props.onAnswerChange - Callback when answer changes
 * @param props.onSubmit - Callback when answer is submitted
 * @param props.userAnswer - Current user answer
 * @param props.feedback - Feedback message to display
 * @param props.isCorrect - Whether the answer was correct
 * @returns JSX Element
 */
export default function SentenceTransformationExercise({
  exercise,
  onAnswerChange,
  userAnswer,
  feedback,
  isCorrect,
}: SentenceTransformationExerciseProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onAnswerChange(e.target.value)
  }

  // Format the transformation type for display
  const formatTransformationType = (type: string): string => {
    const typeMap: Record<string, string> = {
      negative: 'Negate the sentence',
      affirmative: 'Make the sentence affirmative',
      interrogative: 'Make the sentence a question',
      'negative-interrogative': 'Make the sentence a negative question',
      past: 'Put the sentence in the past tense',
      future: 'Put the sentence in the future tense',
    }
    return typeMap[type] || type
  }

  const displayType = formatTransformationType(exercise.transformation_type)

  return (
    <div 
      className="sentence-transformation-exercise"
      data-testid="sentence-transformation-exercise"
    >
      <p className="exercise-prompt">
        {displayType}
      </p>
      <p className="exercise-source-text">"{exercise.prompt}"</p>
      
      <div className="exercise-answer-section">
        <label htmlFor="transformation-answer" className="exercise-answer-label">
          Your transformed sentence:
        </label>
        <input
          type="text"
          id="transformation-answer"
          value={userAnswer}
          onChange={handleInputChange}
          className="exercise-text-input"
          placeholder="Enter transformed sentence"
          aria-label="Transformed sentence"
          data-testid="sentence-transformation-input"
          autoFocus
        />
      </div>
      
      {/* Transformation type info */}
      <div className="transformation-info">
        <p>
          <small>
            Transformation: {exercise.transformation_type}
          </small>
        </p>
      </div>
    </div>
  )
}
