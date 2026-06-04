/**
 * ExercisePage Component
 * 
 * Page component for practicing individual grammar exercises.
 * Loads and displays a single exercise with the Exercise component.
 */

import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Exercise from '../components/Exercise'
import { grammarApi } from '../utils/api'
import type { Exercise as ExerciseType } from '../types/index'

/**
 * ExercisePage component - page for practicing a single grammar exercise
 * 
 * @returns JSX Element
 */
export default function ExercisePage() {
  const { exerciseId } = useParams<{ exerciseId: string }>()
  const navigate = useNavigate()
  
  // State for exercise data and loading/error
  const [exercise, setExercise] = useState<ExerciseType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // State for score tracking (if doing multiple exercises)
  const [score, setScore] = useState(0)
  const [total, setTotal] = useState(1)

  // Fetch exercise when component mounts or exerciseId changes
  useEffect(() => {
    const fetchExercise = async () => {
      if (!exerciseId) return
      
      setIsLoading(true)
      setError(null)
      
      try {
        // Try to fetch from backend endpoint first
        const data = await grammarApi.getExercise(exerciseId)
        setExercise(data)
      } catch (err) {
        // If backend fails, try to load from static files
        // This is a fallback for development
        try {
          const response = await fetch(`/data/grammar/exercises/${exerciseId}.json`)
          if (!response.ok) {
            throw new Error('Exercise not found')
          }
          const data = await response.json()
          setExercise(data)
        } catch (fallbackErr) {
          setError(err instanceof Error ? err.message : 'Failed to load exercise')
          setExercise(null)
        }
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchExercise()
  }, [exerciseId])

  // Handle answer submission
  const handleAnswerSubmit = useCallback((exerciseId: string, userAnswer: string) => {
    // In this simple version, we just track whether the answer was submitted
    // For a full implementation, we'd check correctness and update score
    console.log(`Answer submitted for ${exerciseId}: ${userAnswer}`)
    
    // For now, just increment score for demonstration
    // In a real implementation, we'd check if the answer is correct
    setTotal(total + 1)
  }, [total])

  // Handle navigation back
  const handleBack = useCallback(() => {
    navigate('/exercises')
  }, [navigate])

  // Handle navigation to exercises list
  const handleChooseAnother = useCallback(() => {
    navigate('/exercises')
  }, [navigate])

  if (isLoading) {
    return (
      <div className="exercise-page" data-testid="exercise-page">
        <div className="loading-message">
          Loading exercise...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="exercise-page" data-testid="exercise-page">
        <div className="error-message">
          {error}
          <button onClick={handleBack} className="btn-secondary">
            Back to Reference
          </button>
        </div>
      </div>
    )
  }

  if (!exercise) {
    return (
      <div className="exercise-page" data-testid="exercise-page">
        <div className="no-results">
          <p>Exercise not found</p>
          <button onClick={handleBack} className="btn-secondary">
            Back to Reference
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="exercise-page" data-testid="exercise-page">
      <header className="exercise-page-header">
        <button 
          onClick={handleBack}
          className="btn-back"
          aria-label="Back to reference"
          data-testid="exercise-back"
        >
          ← Back
        </button>
        <h2 className="exercise-page-title">Grammar Exercise</h2>
      </header>
      
      <div className="exercise-page-content">
        <Exercise
          exercise={exercise}
          onAnswerSubmit={handleAnswerSubmit}
          score={score}
          total={total}
        />
      </div>
      
      <div className="exercise-page-footer">
        <button 
          onClick={handleChooseAnother}
          className="btn-secondary"
          data-testid="exercise-choose-another"
        >
          Choose Another Exercise
        </button>
      </div>
    </div>
  )
}
