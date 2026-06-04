/**
 * FillInTheBlankExercise Component
 * 
 * Displays a fill-in-the-blank exercise with a text input for the user to provide their answer.
 */

import React from 'react'
import type { FillInTheBlankExerciseProps } from '../../types/index'

/**
 * FillInTheBlankExercise component - text input for fill-in-the-blank exercises
 * 
 * @param props - Component props
 * @param props.exercise - The fill-in-the-blank exercise to display
 * @param props.onAnswerChange - Callback when answer changes
 * @param props.onSubmit - Callback when answer is submitted
 * @param props.userAnswer - Current user answer
 * @param props.feedback - Feedback message to display
 * @param props.isCorrect - Whether the answer was correct
 * @returns JSX Element
 */
export default function FillInTheBlankExercise({
  exercise,
  onAnswerChange,
  userAnswer,
  feedback,
  isCorrect,
}: FillInTheBlankExerciseProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onAnswerChange(e.target.value)
  }

  // Parse the prompt to find blank positions
  const blankPlaceholder = '___'
  const promptParts = exercise.prompt.split(blankPlaceholder)

  return (
    <div 
      className="fill-in-the-blank-exercise"
      data-testid="fill-in-the-blank-exercise"
    >
      <p className="exercise-prompt">
        {promptParts.map((part, index) => (
          <React.Fragment key={index}>
            {part}
            {index < promptParts.length - 1 && (
              <span className="exercise-blank-container">
                <input
                  type="text"
                  value={userAnswer}
                  onChange={handleInputChange}
                  className="exercise-blank-input"
                  placeholder="Your answer"
                  aria-label="Fill in the blank"
                  data-testid="fill-in-the-blank-input"
                  autoFocus
                />
              </span>
            )}
          </React.Fragment>
        ))}
      </p>
    </div>
  )
}
