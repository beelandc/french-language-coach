import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { sessionApi } from '../utils/api'
import type { CardProposal, StudyPlan as StudyPlanData } from '../types'

/** Name of the deck accepted cards go into (matches the backend's STUDY_DECK_NAME). */
export const STUDY_DECK_NAME = 'Mes mots de session'

/**
 * True for a 404 from the API. Checks the `status` field that `HttpError` carries
 * rather than `instanceof`, so it also works when the API module is mocked.
 */
function isNotFound(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { status?: unknown }).status === 404
}

export type StudyPlanState = 'checking' | 'idle' | 'loading' | 'error' | 'ready'

export interface StudyPlanViewProps {
  /** Which part of the flow to show. */
  state: StudyPlanState
  /** The plan, when `state` is `ready`. */
  plan?: StudyPlanData | null
  /** Error message, when `state` is `error`. */
  error?: string | null
  /** Error from the last Accept/Reject, shown above the cards. */
  actionError?: string | null
  /** Ids of proposals whose Accept/Reject request is in flight. */
  pendingProposalIds?: number[]
  onBuild?: () => void
  onRetry?: () => void
  onAccept?: (proposalId: number) => void
  onReject?: (proposalId: number) => void
}

function ProposalStatus({ proposal }: { proposal: CardProposal }) {
  if (proposal.status === 'accepted') {
    return (
      <span className="proposal-status proposal-status-accepted" data-testid={`proposal-status-${proposal.id}`}>
        Added to {STUDY_DECK_NAME}
      </span>
    )
  }
  if (proposal.status === 'rejected') {
    return (
      <span className="proposal-status proposal-status-rejected" data-testid={`proposal-status-${proposal.id}`}>
        Dismissed
      </span>
    )
  }
  if (proposal.already_known) {
    return (
      <span className="proposal-status proposal-status-known" data-testid={`proposal-status-${proposal.id}`}>
        Already in your cards
      </span>
    )
  }
  return null
}

/**
 * Presentational study plan (Issue #270): the build button, loading and error states,
 * the plan's steps with links to lessons and exercises, and the proposed flashcards
 * with Accept and Reject. Takes everything from props so stories need no network.
 */
export function StudyPlanView({
  state,
  plan,
  error,
  actionError,
  pendingProposalIds = [],
  onBuild,
  onRetry,
  onAccept,
  onReject,
}: StudyPlanViewProps) {
  if (state === 'checking') {
    return null
  }

  return (
    <div className="feedback-section study-plan" data-testid="study-plan-section">
      <h3>Study plan</h3>

      {state === 'idle' && (
        <div className="study-plan-intro" data-testid="study-plan-idle">
          <p>Get a short plan for this session: lessons and exercises for your mistakes, and flashcards for new words.</p>
          <button type="button" className="btn-primary" onClick={onBuild} data-testid="build-study-plan-button">
            Build my study plan
          </button>
        </div>
      )}

      {state === 'loading' && (
        <p className="study-plan-loading" data-testid="study-plan-loading" role="status">
          Building your study plan… this can take up to a minute.
        </p>
      )}

      {state === 'error' && (
        <div data-testid="study-plan-error">
          <div className="error-message">{error}</div>
          <button type="button" className="btn-secondary" onClick={onRetry} data-testid="retry-study-plan-button">
            Try again
          </button>
        </div>
      )}

      {state === 'ready' && plan && (
        <div data-testid="study-plan-ready">
          <p className="study-plan-summary" data-testid="study-plan-summary">{plan.summary}</p>

          <ol className="study-plan-items" data-testid="study-plan-items">
            {plan.items.map((item) => (
              <li key={item.lesson_id} className="study-plan-item" data-testid={`study-plan-item-${item.lesson_id}`}>
                <Link to={`/lessons/${item.lesson_id}`} className="study-plan-lesson" data-testid={`study-plan-lesson-${item.lesson_id}`}>
                  {item.lesson_title}
                </Link>
                <p className="study-plan-why">{item.why}</p>
                <div className="study-plan-addresses">
                  <span>Addresses:</span>
                  <ul>
                    {item.addresses.map((text) => (
                      <li key={text}>« {text} »</li>
                    ))}
                  </ul>
                </div>
                {item.exercise_ids.length > 0 && (
                  <div className="study-plan-exercises">
                    <span>Practice:</span>{' '}
                    {item.exercise_ids.map((exerciseId) => (
                      <Link
                        key={exerciseId}
                        to={`/exercises/${exerciseId}`}
                        className="study-plan-exercise"
                        data-testid={`study-plan-exercise-${exerciseId}`}
                      >
                        {exerciseId}
                      </Link>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ol>

          {plan.proposals.length > 0 && (
            <div className="study-plan-cards" data-testid="study-plan-cards">
              <h4>Suggested flashcards</h4>
              <p className="study-plan-cards-note">Nothing is added to your vocabulary until you accept a card.</p>
              {actionError && (
                <div className="error-message" data-testid="proposal-action-error">{actionError}</div>
              )}
              <ul>
                {plan.proposals.map((proposal) => {
                  const isPending = pendingProposalIds.includes(proposal.id)
                  const canDecide = proposal.status === 'pending' && !proposal.already_known
                  return (
                    <li key={proposal.id} className="card-proposal" data-testid={`card-proposal-${proposal.id}`}>
                      <div className="card-proposal-text">
                        <strong>{proposal.front}</strong> — {proposal.back}
                        {proposal.example && <div className="card-proposal-example">{proposal.example}</div>}
                      </div>
                      <div className="card-proposal-actions">
                        <ProposalStatus proposal={proposal} />
                        {proposal.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              className="btn-primary"
                              disabled={!canDecide || isPending}
                              onClick={() => onAccept?.(proposal.id)}
                              data-testid={`accept-proposal-${proposal.id}`}
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              className="btn-secondary"
                              disabled={isPending}
                              onClick={() => onReject?.(proposal.id)}
                              data-testid={`reject-proposal-${proposal.id}`}
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export interface StudyPlanProps {
  /** Session whose study plan to show. */
  sessionId: string
}

/**
 * Study plan for a session (Issue #270). Loads a stored plan on mount; if there is none
 * it offers "Build my study plan", which runs the study-coach agent on the server.
 * Accept and Reject update each proposed card; only Accept creates a card.
 */
export default function StudyPlan({ sessionId }: StudyPlanProps) {
  const [state, setState] = useState<StudyPlanState>('checking')
  const [plan, setPlan] = useState<StudyPlanData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingProposalIds, setPendingProposalIds] = useState<number[]>([])

  useEffect(() => {
    let cancelled = false
    sessionApi
      .getStudyPlan(sessionId)
      .then((stored) => {
        if (cancelled) return
        setPlan(stored)
        setState('ready')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (isNotFound(err)) {
          setState('idle')
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load the study plan')
          setState('error')
        }
      })
    return () => {
      cancelled = true
    }
  }, [sessionId])

  const build = useCallback(async () => {
    setState('loading')
    setError(null)
    try {
      setPlan(await sessionApi.createStudyPlan(sessionId))
      setState('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to build the study plan')
      setState('error')
    }
  }, [sessionId])

  const decide = useCallback(
    async (proposalId: number, action: 'accept' | 'reject') => {
      setActionError(null)
      setPendingProposalIds((ids) => [...ids, proposalId])
      try {
        const updated =
          action === 'accept'
            ? await sessionApi.acceptCardProposal(sessionId, proposalId)
            : await sessionApi.rejectCardProposal(sessionId, proposalId)
        setPlan((current) =>
          current
            ? { ...current, proposals: current.proposals.map((p) => (p.id === proposalId ? updated : p)) }
            : current
        )
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Failed to update the card')
      } finally {
        setPendingProposalIds((ids) => ids.filter((id) => id !== proposalId))
      }
    },
    [sessionId]
  )

  return (
    <StudyPlanView
      state={state}
      plan={plan}
      error={error}
      actionError={actionError}
      pendingProposalIds={pendingProposalIds}
      onBuild={build}
      onRetry={build}
      onAccept={(id) => decide(id, 'accept')}
      onReject={(id) => decide(id, 'reject')}
    />
  )
}
