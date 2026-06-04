/**
 * TranslationExercise Component
 * 
 * Displays a translation exercise with a text input for the user to provide their translation.
 */

import React from 'react'
import type { TranslationExerciseProps } from '../../types/index'

/**
 * TranslationExercise component - text input for translation exercises
 * 
 * @param props - Component props
 * @param props.exercise - The translation exercise to display
 * @param props.onAnswerChange - Callback when answer changes
 * @param props.onSubmit - Callback when answer is submitted
 * @param props.userAnswer - Current user answer
 * @param props.feedback - Feedback message to display
 * @param props.isCorrect - Whether the answer was correct
 * @returns JSX Element
 */
export default function TranslationExercise({
  exercise,
  onAnswerChange,
  userAnswer,
  feedback,
  isCorrect,
}: TranslationExerciseProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onAnswerChange(e.target.value)
  }

  // Get language names from codes
  const getLanguageName = (code: string): string => {
    const languageMap: Record<string, string> = {
      fr: 'French',
      en: 'English',
      es: 'Spanish',
      de: 'German',
      it: 'Italian',
    }
    return languageMap[code] || code.toUpperCase()
  }

  const sourceLang = getLanguageName(exercise.source_language)
  const targetLang = getLanguageName(exercise.target_language)

  return (
    <div 
      className="translation-exercise"
      data-testid="translation-exercise"
    >
      <p className="exercise-prompt">
        Translate from {sourceLang} to {targetLang}:
      </p>
      <p className="exercise-source-text">"{exercise.prompt}"</p>
      
      <div className="exercise-answer-section">
        <label htmlFor="translation-answer" className="exercise-answer-label">
          Your translation ({targetLang}):
        </label>
        <input
          type="text"
          id="translation-answer"
          value={userAnswer}
          onChange={handleInputChange}
          className="exercise-text-input"
          placeholder={`Enter translation in ${targetLang}`}
          aria-label={`Your translation in ${targetLang}`}
          data-testid="translation-input"
          autoFocus
        />
      </div>
    </div>
  )
}
