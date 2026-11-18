import type { Meta, StoryObj } from '@storybook/react'
import { StudyPlanView } from './StudyPlan'
import type { StudyPlan } from '@/types'

/**
 * Study plan from the study-coach agent (Issue #270). The stories render the
 * presentational `StudyPlanView` from props, so they need no backend.
 */
const meta: Meta<typeof StudyPlanView> = {
  title: 'Components/StudyPlan',
  component: StudyPlanView,
  tags: ['autodocs'],
}

export default meta

type Story = StoryObj<typeof meta>

const plan: StudyPlan = {
  session_id: 7,
  summary:
    'Vous maîtrisez bien les formules de politesse. Travaillez maintenant le subjonctif et le genre des noms courants.',
  items: [
    {
      lesson_id: 'subjunctive',
      lesson_title: 'The Subjunctive Mood',
      exercise_ids: [],
      addresses: ['il faut que tu viens'],
      why: 'Après « il faut que », on emploie le subjonctif : « que tu viennes ».',
    },
    {
      lesson_id: 'articles',
      lesson_title: 'Articles',
      exercise_ids: ['fill-in-the-blank-present-tense'],
      addresses: ['une croissant', 'à le comptoir'],
      why: 'Le genre des noms et les contractions (au, du) reviennent souvent au café.',
    },
  ],
  proposals: [
    {
      id: 1,
      front: 'un croissant',
      back: 'a croissant',
      example: 'Je voudrais un croissant, s’il vous plaît.',
      source: 'une croissant',
      status: 'pending',
      already_known: false,
      card_id: null,
      deck_id: null,
    },
    {
      id: 2,
      front: 'le comptoir',
      back: 'the counter',
      example: null,
      source: 'à le comptoir',
      status: 'accepted',
      already_known: false,
      card_id: 42,
      deck_id: 9,
    },
    {
      id: 3,
      front: 'la monnaie',
      back: 'change (coins)',
      example: null,
      source: null,
      status: 'rejected',
      already_known: false,
      card_id: null,
      deck_id: null,
    },
    {
      id: 4,
      front: 'un café',
      back: 'a coffee',
      example: null,
      source: null,
      status: 'pending',
      already_known: true,
      card_id: null,
      deck_id: null,
    },
  ],
  model: 'claude-sonnet-5-5',
  created_at: '2026-11-17T10:00:00',
}

export const Idle: Story = { args: { state: 'idle' } }

export const Loading: Story = { args: { state: 'loading' } }

export const Error: Story = {
  args: {
    state: 'error',
    error: "The study plan could not be built: the AI didn't finish a valid plan. Please try again.",
  },
}

export const Ready: Story = { args: { state: 'ready', plan } }

export const AcceptInFlight: Story = {
  args: { state: 'ready', plan, pendingProposalIds: [1] },
}
