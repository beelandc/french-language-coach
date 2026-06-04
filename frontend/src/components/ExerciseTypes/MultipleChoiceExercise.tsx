/**
 * MultipleChoiceExercise Component
 * 
 * Displays a multiple-choice exercise with radio buttons for the user to select their answer.
 */

import React from 'react'
import type { MultipleChoiceExerciseProps } from '../../types/index'

/**
 * MultipleChoiceExercise component - radio buttons for multiple-choice exercises
 * 
 * @param props - Component props
 * @param props.exercise - The multiple-choice exercise to display
 * @param props.onAnswerChange - Callback when answer changes
 * @param props.onSubmit - Callback when answer is submitted
 * @param props.selectedAnswer - Currently selected answer
 * @param props.feedback - Feedback message to display
 * @param props.isCorrect - Whether the answer was correct
 * @returns JSX Element
 */
export default function MultipleChoiceExercise({
  exercise,
  onAnswerChange,
  selectedAnswer,
  feedback,
  isCorrect,
}: MultipleChoiceExerciseProps) {
  const handleOptionChange = (option: string) => {
    onAnswerChange(option)
  }

  return (
    <div 
      className="multiple-choice-exercise"
      data-testid="multiple-choice-exercise"
    >
      <p className="exercise-prompt">{exercise.prompt}</p>
      
      <div className="exercise-options" role="radiogroup" aria-label="Answer options">
        {exercise.options.map((option, index) => {
          const isSelected = selectedAnswer === option
          const isCorrectAnswer = isCorrect !== null && exercise.correct_answer === option
          const isIncorrectAnswer = isCorrect === false && selectedAnswer === option
          
          return (
            <label
              key={index}
              className={`exercise-option ${isSelected ? 'option-selected' : ''} ${isCorrectAnswer ? 'option-correct' : ''} ${isIncorrectAnswer ? 'option-incorrect' : ''}`}
              htmlFor={`option-${index}`}
            >
              <input
                type="radio"
                id={`option-${index}`}
                name="multiple-choice-answer"
                value={option}
                checked={isSelected}
                onChange={() => handleOptionChange(option)}
                className="exercise-option-input"
                aria-label={`Option ${index + 1}: ${option}`}
                data-testid={`multiple-choice-option-${index}`}
              />
              <span className="exercise-option-content">
                <span className="option-letter">{String.fromCharCode(65 + index)}.</span>
                <span className="option-text">{option}</span>
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
