/**
 * ConjugationExercise Component
 * 
 * Displays a conjugation exercise with verb, tense, and pronoun information.
 * User provides the conjugated form of the verb.
 */

import React from 'react'
import type { ConjugationExerciseProps } from '../../types/index'

/**
 * ConjugationExercise component - text input for conjugation exercises
 * 
 * @param props - Component props
 * @param props.exercise - The conjugation exercise to display
 * @param props.onAnswerChange - Callback when answer changes
 * @param props.onSubmit - Callback when answer is submitted
 * @param props.userAnswer - Current user answer
 * @param props.feedback - Feedback message to display
 * @param props.isCorrect - Whether the answer was correct
 * @returns JSX Element
 */
export default function ConjugationExercise({
  exercise,
  onAnswerChange,
  userAnswer,
  feedback,
  isCorrect,
}: ConjugationExerciseProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onAnswerChange(e.target.value)
  }

  return (
    <div 
      className="conjugation-exercise"
      data-testid="conjugation-exercise"
    >
      <p className="exercise-prompt">
        Conjugate the verb <strong>{exercise.verb}</strong> 
        ({exercise.pronoun}) in the <strong>{exercise.tense}</strong> tense.
      </p>
      
      <div className="exercise-answer-section">
        <label htmlFor="conjugation-answer" className="exercise-answer-label">
          Your answer:
        </label>
        <input
          type="text"
          id="conjugation-answer"
          value={userAnswer}
          onChange={handleInputChange}
          className="exercise-text-input"
          placeholder="Enter conjugated form"
          aria-label="Conjugated verb form"
          data-testid="conjugation-input"
          autoFocus
        />
      </div>
      
      {/* Additional info */}
      <div className="conjugation-info">
        <p>
          <small>
            Verb: {exercise.verb} | Pronoun: {exercise.pronoun} | Tense: {exercise.tense}
          </small>
        </p>
      </div>
    </div>
  )
}
