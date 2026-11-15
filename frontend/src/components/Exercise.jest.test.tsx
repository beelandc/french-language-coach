/**
 * Tests for the Exercise wrapper component (Issue #250)
 *
 * - onAnswerSubmit is required, so it is always called and the Next button always shows after
 *   a submit (the old `onAnswerSubmit &&` condition was always true)
 * - The unknown-type fallback still renders for runtime data outside ExerciseType
 */

import { render, screen, fireEvent } from '@testing-library/react'
import Exercise from './Exercise'
import type { Exercise as ExerciseData } from '../types/index'

const fillInTheBlank: ExerciseData = {
  id: 'ex-1',
  type: 'fill-in-the-blank',
  prompt: 'Je ___ français.',
  correct_answer: 'parle',
  topic: 'present tense',
  difficulty: 'beginner',
}

const multipleChoice: ExerciseData = {
  id: 'ex-2',
  type: 'multiple-choice',
  prompt: 'Choose the correct article: ___ maison',
  options: ['le', 'la', 'les'],
  correct_answer: 'la',
  topic: 'articles',
  difficulty: 'beginner',
}

const typeAnswer = (value: string) => {
  fireEvent.change(screen.getByRole('textbox'), { target: { value } })
}

describe('Exercise', () => {
  it('submits a correct answer, shows feedback and the Next button', () => {
    const onAnswerSubmit = jest.fn()
    render(<Exercise exercise={fillInTheBlank} onAnswerSubmit={onAnswerSubmit} />)

    typeAnswer('parle')
    fireEvent.click(screen.getByTestId('exercise-submit'))

    expect(onAnswerSubmit).toHaveBeenCalledWith('ex-1', 'parle')
    expect(screen.getByText('✓ Correct!')).toBeInTheDocument()
    expect(screen.getByTestId('exercise-next')).toBeInTheDocument()
    expect(screen.queryByTestId('exercise-submit')).not.toBeInTheDocument()
  })

  it('shows the correct answer for an incorrect submission and still offers Next', () => {
    const onAnswerSubmit = jest.fn()
    render(<Exercise exercise={fillInTheBlank} onAnswerSubmit={onAnswerSubmit} />)

    typeAnswer('parles')
    fireEvent.click(screen.getByTestId('exercise-submit'))

    expect(onAnswerSubmit).toHaveBeenCalledWith('ex-1', 'parles')
    expect(screen.getByText('✗ Incorrect. The correct answer is: parle')).toBeInTheDocument()
    expect(screen.getByTestId('exercise-next')).toBeInTheDocument()
  })

  it('resets feedback when Next is clicked', () => {
    render(<Exercise exercise={fillInTheBlank} onAnswerSubmit={jest.fn()} />)

    typeAnswer('parle')
    fireEvent.click(screen.getByTestId('exercise-submit'))
    fireEvent.click(screen.getByTestId('exercise-next'))

    expect(screen.queryByText('✓ Correct!')).not.toBeInTheDocument()
    expect(screen.queryByTestId('exercise-next')).not.toBeInTheDocument()
    expect(screen.getByTestId('exercise-submit')).toBeDisabled()
  })

  it('marks the correct option after a multiple-choice submission', () => {
    const onAnswerSubmit = jest.fn()
    render(<Exercise exercise={multipleChoice} onAnswerSubmit={onAnswerSubmit} />)

    // No option is highlighted as correct before submitting
    expect(screen.getByText('la').closest('label')).not.toHaveClass('option-correct')

    fireEvent.click(screen.getByTestId('multiple-choice-option-0'))
    fireEvent.click(screen.getByTestId('exercise-submit'))

    expect(onAnswerSubmit).toHaveBeenCalledWith('ex-2', 'le')
    expect(screen.getByText('la').closest('label')).toHaveClass('option-correct')
    expect(screen.getByText('le').closest('label')).toHaveClass('option-incorrect')
    expect(screen.getByTestId('exercise-next')).toBeInTheDocument()
  })

  it.each<[string, ExerciseData]>([
    [
      'translation',
      {
        id: 'ex-4',
        type: 'translation',
        prompt: 'I speak French.',
        correct_answer: 'Je parle français.',
        topic: 'present tense',
        difficulty: 'beginner',
        source_language: 'en',
        target_language: 'fr',
      },
    ],
    [
      'conjugation',
      {
        id: 'ex-5',
        type: 'conjugation',
        prompt: 'Conjugate parler',
        correct_answer: null,
        correct_answers: ['parlons'],
        topic: 'present tense',
        difficulty: 'beginner',
        verb: 'parler',
        tense: 'présent',
        pronoun: 'nous',
      },
    ],
    [
      'sentence-transformation',
      {
        id: 'ex-6',
        type: 'sentence-transformation',
        prompt: 'Make it negative: Je parle.',
        correct_answer: 'Je ne parle pas.',
        topic: 'negation',
        difficulty: 'beginner',
        transformation_type: 'negation',
      },
    ],
  ])('renders the %s input and checks the answer', (type, exercise) => {
    const onAnswerSubmit = jest.fn()
    render(<Exercise exercise={exercise} onAnswerSubmit={onAnswerSubmit} />)

    const answer = exercise.correct_answer ?? exercise.correct_answers?.[0] ?? ''
    fireEvent.change(screen.getByTestId(`${type}-input`), { target: { value: answer } })
    fireEvent.click(screen.getByTestId('exercise-submit'))

    expect(onAnswerSubmit).toHaveBeenCalledWith(exercise.id, answer)
    expect(screen.getByText('✓ Correct!')).toBeInTheDocument()
  })

  it('lists all accepted answers when an answer with several correct forms is wrong', () => {
    render(
      <Exercise
        exercise={{ ...fillInTheBlank, correct_answer: null, correct_answers: ['parle', 'parlais'] }}
        onAnswerSubmit={jest.fn()}
      />
    )

    typeAnswer('parlons')
    fireEvent.click(screen.getByTestId('exercise-submit'))

    expect(screen.getByText('✗ Incorrect. Correct answers: parle, parlais')).toBeInTheDocument()
  })

  it('renders the fallback for an exercise type it does not know', () => {
    // Runtime data (API/JSON) isn't type-checked, so parse an unknown type from JSON
    const unknownExercise: ExerciseData = JSON.parse(
      JSON.stringify({ ...fillInTheBlank, id: 'ex-3', type: 'matching' })
    )
    render(<Exercise exercise={unknownExercise} onAnswerSubmit={jest.fn()} />)

    expect(screen.getByTestId('exercise-error')).toHaveTextContent('Unknown exercise type: matching')
  })

  it('shows the score and hint when provided', () => {
    render(
      <Exercise
        exercise={{ ...fillInTheBlank, hint: 'First person singular of parler' }}
        onAnswerSubmit={jest.fn()}
        score={2}
        total={5}
      />
    )

    expect(screen.getByText('Score: 2/5')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('exercise-hint-toggle'))
    expect(screen.getByText('First person singular of parler')).toBeInTheDocument()
  })
})
