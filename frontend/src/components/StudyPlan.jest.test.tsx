/**
 * Tests for the StudyPlan component (Issue #270).
 *
 * The container loads a stored plan (404 → build button), builds one on demand, and
 * calls the accept/reject endpoints. Only Accept creates a card on the server; here
 * we check the UI calls the right endpoint and shows each proposal's status.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import StudyPlan, { StudyPlanView } from './StudyPlan'
import { HttpError, sessionApi } from '../utils/api'
import type { CardProposal, StudyPlan as StudyPlanData } from '../types'

jest.mock('../utils/api', () => {
  const actual = jest.requireActual('../utils/api')
  return {
    ...actual,
    sessionApi: {
      getStudyPlan: jest.fn(),
      createStudyPlan: jest.fn(),
      acceptCardProposal: jest.fn(),
      rejectCardProposal: jest.fn(),
    },
  }
})

const api = sessionApi as jest.Mocked<typeof sessionApi>

function proposal(overrides: Partial<CardProposal> = {}): CardProposal {
  return {
    id: 1,
    front: 'un croissant',
    back: 'a croissant',
    example: 'Je voudrais un croissant.',
    source: 'une croissant',
    status: 'pending',
    already_known: false,
    card_id: null,
    deck_id: null,
    ...overrides,
  }
}

const plan: StudyPlanData = {
  session_id: 7,
  summary: 'Travaillez le subjonctif.',
  items: [
    {
      lesson_id: 'subjunctive',
      lesson_title: 'The Subjunctive Mood',
      exercise_ids: ['conjugation-parler-nous'],
      addresses: ['il faut que tu viens'],
      why: 'Après « il faut que », on emploie le subjonctif.',
    },
  ],
  proposals: [
    proposal(),
    proposal({ id: 2, front: 'le comptoir', back: 'the counter', example: null }),
    proposal({ id: 3, front: 'un café', back: 'a coffee', example: null, already_known: true }),
  ],
  model: 'claude-sonnet-5-5',
  created_at: '2026-11-17T10:00:00',
}

function renderStudyPlan() {
  return render(
    <MemoryRouter>
      <StudyPlan sessionId="7" />
    </MemoryRouter>
  )
}

beforeEach(() => {
  jest.resetAllMocks()
})

describe('StudyPlan (Issue #270)', () => {
  it('offers to build a plan when none is stored, then shows it', async () => {
    api.getStudyPlan.mockRejectedValue(new HttpError('No study plan for this session yet.', 404))
    let resolveCreate: (value: StudyPlanData) => void = () => {}
    api.createStudyPlan.mockReturnValue(new Promise((resolve) => { resolveCreate = resolve }))
    renderStudyPlan()

    fireEvent.click(await screen.findByTestId('build-study-plan-button'))

    expect(api.createStudyPlan).toHaveBeenCalledWith('7')
    expect(screen.getByTestId('study-plan-loading')).toHaveTextContent('Building your study plan')
    resolveCreate(plan)
    expect(await screen.findByTestId('study-plan-summary')).toHaveTextContent('Travaillez le subjonctif.')
    expect(screen.getByTestId('study-plan-lesson-subjunctive')).toHaveAttribute('href', '/lessons/subjunctive')
    expect(screen.getByTestId('study-plan-exercise-conjugation-parler-nous')).toHaveAttribute(
      'href',
      '/exercises/conjugation-parler-nous'
    )
    expect(screen.getByTestId('study-plan-item-subjunctive')).toHaveTextContent('« il faut que tu viens »')
  })

  it('shows a stored plan without building one', async () => {
    api.getStudyPlan.mockResolvedValue(plan)
    renderStudyPlan()

    expect(await screen.findByTestId('study-plan-ready')).toBeInTheDocument()
    expect(api.createStudyPlan).not.toHaveBeenCalled()
    expect(screen.getByTestId('card-proposal-1')).toHaveTextContent('un croissant — a croissant')
  })

  it('shows a build error with Try again', async () => {
    api.getStudyPlan.mockRejectedValue(new HttpError('No study plan for this session yet.', 404))
    api.createStudyPlan
      .mockRejectedValueOnce(new HttpError("The study plan could not be built: the AI didn't finish a valid plan. Please try again.", 502))
      .mockResolvedValueOnce(plan)
    renderStudyPlan()

    fireEvent.click(await screen.findByTestId('build-study-plan-button'))
    expect(await screen.findByTestId('study-plan-error')).toHaveTextContent('could not be built')

    fireEvent.click(screen.getByTestId('retry-study-plan-button'))
    expect(await screen.findByTestId('study-plan-ready')).toBeInTheDocument()
    expect(api.createStudyPlan).toHaveBeenCalledTimes(2)
  })

  it('shows a load error other than 404', async () => {
    api.getStudyPlan.mockRejectedValue(new HttpError('Server error', 500))
    renderStudyPlan()

    expect(await screen.findByTestId('study-plan-error')).toHaveTextContent('Server error')
  })

  it('accepts a card through the API and shows it as added', async () => {
    api.getStudyPlan.mockResolvedValue(plan)
    api.acceptCardProposal.mockResolvedValue(proposal({ status: 'accepted', card_id: 42, deck_id: 9 }))
    renderStudyPlan()

    fireEvent.click(await screen.findByTestId('accept-proposal-1'))

    await waitFor(() =>
      expect(screen.getByTestId('proposal-status-1')).toHaveTextContent('Added to Mes mots de session')
    )
    expect(api.acceptCardProposal).toHaveBeenCalledWith('7', 1)
    expect(api.rejectCardProposal).not.toHaveBeenCalled()
    expect(screen.queryByTestId('accept-proposal-1')).not.toBeInTheDocument()
  })

  it('rejects a card without accepting it', async () => {
    api.getStudyPlan.mockResolvedValue(plan)
    api.rejectCardProposal.mockResolvedValue(proposal({ id: 2, front: 'le comptoir', status: 'rejected' }))
    renderStudyPlan()

    fireEvent.click(await screen.findByTestId('reject-proposal-2'))

    await waitFor(() => expect(screen.getByTestId('proposal-status-2')).toHaveTextContent('Dismissed'))
    expect(api.rejectCardProposal).toHaveBeenCalledWith('7', 2)
    expect(api.acceptCardProposal).not.toHaveBeenCalled()
  })

  it('shows an Accept/Reject failure', async () => {
    api.getStudyPlan.mockResolvedValue(plan)
    api.acceptCardProposal.mockRejectedValue(new HttpError('This card is already in your vocabulary.', 409))
    renderStudyPlan()

    fireEvent.click(await screen.findByTestId('accept-proposal-1'))

    expect(await screen.findByTestId('proposal-action-error')).toHaveTextContent('already in your vocabulary')
    expect(screen.getByTestId('accept-proposal-1')).not.toBeDisabled()
  })

  it('disables Accept for a card that is already known', async () => {
    api.getStudyPlan.mockResolvedValue(plan)
    renderStudyPlan()

    expect(await screen.findByTestId('accept-proposal-3')).toBeDisabled()
    expect(screen.getByTestId('proposal-status-3')).toHaveTextContent('Already in your cards')
    expect(screen.getByTestId('reject-proposal-3')).not.toBeDisabled()
  })
})

describe('StudyPlanView', () => {
  it('renders nothing while checking for a stored plan', () => {
    const { container } = render(<StudyPlanView state="checking" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('disables both buttons while a request is in flight', () => {
    render(
      <MemoryRouter>
        <StudyPlanView state="ready" plan={plan} pendingProposalIds={[1]} />
      </MemoryRouter>
    )
    expect(screen.getByTestId('accept-proposal-1')).toBeDisabled()
    expect(screen.getByTestId('reject-proposal-1')).toBeDisabled()
    expect(screen.getByTestId('accept-proposal-2')).not.toBeDisabled()
  })

  it('hides the cards section when there are no proposals', () => {
    render(
      <MemoryRouter>
        <StudyPlanView state="ready" plan={{ ...plan, proposals: [] }} />
      </MemoryRouter>
    )
    expect(screen.queryByTestId('study-plan-cards')).not.toBeInTheDocument()
  })
})
