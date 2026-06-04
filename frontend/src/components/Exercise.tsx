/**
 * Exercise Component
 * 
 * Main wrapper component for grammar exercises.
 * Delegates to type-specific exercise components based on the exercise type.
 * Manages state for user answers, feedback, and scoring.
 */

import { useCallback, useState } from 'react'
import FillInTheBlankExercise from './ExerciseTypes/FillInTheBlankExercise'
import MultipleChoiceExercise from './ExerciseTypes/MultipleChoiceExercise'
import TranslationExercise from './ExerciseTypes/TranslationExercise'
import ConjugationExercise from './ExerciseTypes/ConjugationExercise'
import SentenceTransformationExercise from './ExerciseTypes/SentenceTransformationExercise'
import type { Exercise, ExerciseProps } from '../types/index'

/**
 * Exercise component - main wrapper for all exercise types
 * 
 * @param props - Component props
 * @param props.exercise - The exercise to display
 * @param props.onAnswerSubmit - Callback when an answer is submitted
 * @param props.score - Current score (optional)
 * @param props.total - Total number of exercises (optional)
 * @returns JSX Element
 */
export default function Exercise({ 
  exercise, 
  onAnswerSubmit,
  score = 0,
  total = 0 
}: ExerciseProps) {
  const [userAnswer, setUserAnswer] = useState('')
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [showHint, setShowHint] = useState(false)

  // Reset state when exercise changes
  // (This would be used if the component is reused with different exercises)

  // Check if answer is correct
  const checkAnswer = useCallback((answer: string) => {
    // Get all correct answers (either single or array)
    const correctAnswers: string[] = []
    
    if (exercise.correct_answer) {
      correctAnswers.push(exercise.correct_answer.toLowerCase().trim())
    }
    if (exercise.correct_answers) {
      exercise.correct_answers.forEach(a => {
        correctAnswers.push(a.toLowerCase().trim())
      })
    }
    
    const normalizedAnswer = answer.toLowerCase().trim()
    return correctAnswers.includes(normalizedAnswer)
  }, [exercise])

  // Handle answer submission
  const handleSubmit = useCallback((answer: string) => {
    const correct = checkAnswer(answer)
    setIsCorrect(correct)
    setIsSubmitted(true)
    
    if (correct) {
      setFeedback('✓ Correct!')
    } else {
      // Provide helpful feedback for incorrect answers
      if (exercise.correct_answer) {
        setFeedback(`✗ Incorrect. The correct answer is: ${exercise.correct_answer}`)
      } else if (exercise.correct_answers && exercise.correct_answers.length > 0) {
        setFeedback(`✗ Incorrect. Correct answers: ${exercise.correct_answers.join(', ')}`)
      } else {
        setFeedback('✗ Incorrect.')
      }
    }
    
    // Call the parent callback
    if (onAnswerSubmit) {
      onAnswerSubmit(exercise.id, answer)
    }
  }, [checkAnswer, exercise, onAnswerSubmit])

  // Handle text answer change
  const handleTextAnswerChange = useCallback((value: string) => {
    setUserAnswer(value)
    setIsSubmitted(false)
    setFeedback(null)
    setIsCorrect(null)
  }, [])

  // Handle option selection for multiple choice
  const handleOptionSelect = useCallback((option: string) => {
    setSelectedOption(option)
    setIsSubmitted(false)
    setFeedback(null)
    setIsCorrect(null)
  }, [])

  // Toggle hint visibility
  const toggleHint = useCallback(() => {
    setShowHint(!showHint)
  }, [showHint])

  // Move to next question
  const handleNext = useCallback(() => {
    setUserAnswer('')
    setSelectedOption(null)
    setIsSubmitted(false)
    setFeedback(null)
    setIsCorrect(null)
    setShowHint(false)
  }, [])

  // Render the appropriate exercise component based on type
  const renderExercise = () => {
    switch (exercise.type) {
      case 'fill-in-the-blank':
        return (
          <FillInTheBlankExercise
            exercise={exercise}
            onAnswerChange={handleTextAnswerChange}
            onSubmit={() => handleSubmit(userAnswer)}
            userAnswer={userAnswer}
            feedback={feedback}
            isCorrect={isCorrect}
          />
        )
      case 'multiple-choice':
        return (
          <MultipleChoiceExercise
            exercise={exercise}
            onAnswerChange={handleOptionSelect}
            onSubmit={() => selectedOption && handleSubmit(selectedOption)}
            selectedAnswer={selectedOption}
            feedback={feedback}
            isCorrect={isCorrect}
          />
        )
      case 'translation':
        return (
          <TranslationExercise
            exercise={exercise}
            onAnswerChange={handleTextAnswerChange}
            onSubmit={() => handleSubmit(userAnswer)}
            userAnswer={userAnswer}
            feedback={feedback}
            isCorrect={isCorrect}
          />
        )
      case 'conjugation':
        return (
          <ConjugationExercise
            exercise={exercise}
            onAnswerChange={handleTextAnswerChange}
            onSubmit={() => handleSubmit(userAnswer)}
            userAnswer={userAnswer}
            feedback={feedback}
            isCorrect={isCorrect}
          />
        )
      case 'sentence-transformation':
        return (
          <SentenceTransformationExercise
            exercise={exercise}
            onAnswerChange={handleTextAnswerChange}
            onSubmit={() => handleSubmit(userAnswer)}
            userAnswer={userAnswer}
            feedback={feedback}
            isCorrect={isCorrect}
          />
        )
      default:
        return (
          <div className="exercise-error" data-testid="exercise-error">
            <p>Unknown exercise type: {exercise.type}</p>
          </div>
        )
    }
  }

  return (
    <div 
      className={`exercise ${isCorrect === true ? 'exercise-correct' : ''} ${isCorrect === false ? 'exercise-incorrect' : ''}`}
      data-testid={`exercise-${exercise.type}`}
    >
      {/* Exercise Header */}
      <div className="exercise-header">
        <div className="exercise-info">
          <span className="exercise-topic">{exercise.topic}</span>
          <span className="exercise-difficulty">
            Difficulty: {exercise.difficulty.charAt(0).toUpperCase() + exercise.difficulty.slice(1)}
          </span>
        </div>
        <div className="exercise-score">
          Score: {score}/{total}
        </div>
      </div>

      {/* Exercise Content */}
      <div className="exercise-content">
        {renderExercise()}
      </div>

      {/* Hint */}
      {exercise.hint && (
        <div className="exercise-hint">
          <button 
            onClick={toggleHint}
            className="exercise-hint-toggle"
            aria-label={showHint ? 'Hide hint' : 'Show hint'}
            data-testid="exercise-hint-toggle"
          >
            {showHint ? 'Hide Hint' : 'Show Hint'}
          </button>
          {showHint && (
            <p className="exercise-hint-text">{exercise.hint}</p>
          )}
        </div>
      )}

      {/* Submit Button (for non-multiple-choice exercises) */}
      {exercise.type !== 'multiple-choice' && !isSubmitted && (
        <button
          onClick={() => handleSubmit(userAnswer)}
          disabled={!userAnswer.trim()}
          className="btn-primary exercise-submit"
          aria-label="Submit answer"
          data-testid="exercise-submit"
        >
          Submit Answer
        </button>
      )}

      {/* Multiple Choice Submit */}
      {exercise.type === 'multiple-choice' && !isSubmitted && selectedOption && (
        <button
          onClick={() => handleSubmit(selectedOption)}
          className="btn-primary exercise-submit"
          aria-label="Submit answer"
          data-testid="exercise-submit"
        >
          Submit Answer
        </button>
      )}

      {/* Feedback Display */}
      {isSubmitted && (
        <div className={`exercise-feedback ${isCorrect ? 'feedback-correct' : 'feedback-incorrect'}`}>
          {feedback}
        </div>
      )}

      {/* Next Button */}
      {isSubmitted && onAnswerSubmit && (
        <button
          onClick={handleNext}
          className="btn-secondary exercise-next"
          aria-label="Next question"
          data-testid="exercise-next"
        >
          Next Question
        </button>
      )}
    </div>
  )
}
