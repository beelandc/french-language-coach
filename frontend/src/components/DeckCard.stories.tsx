/**
 * Storybook stories for DeckCard component
 * 
 * Stories for Issue #67: Create DeckBrowser React component
 */

import type { Meta, StoryObj } from '@storybook/react'
import DeckCard from './DeckCard'
import type { DeckCardProps } from '../types/index'

const meta = {
  title: 'Components/DeckCard',
  component: DeckCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onClick: { action: 'clicked' },
  },
} satisfies Meta<typeof DeckCard>

export default meta

type Story = StoryObj<typeof meta>

// Sample deck data for stories
const baseDeck = {
  id: 1,
  name: 'Travel Vocabulary',
  description: 'Essential words for traveling in French-speaking countries',
  created_at: '2026-01-01T00:00:00',
  updated_at: '2026-01-02T00:00:00',
  card_count: 20,
}

const sampleDeck: DeckCardProps['deck'] = {
  ...baseDeck,
  learned_count: 10,
  progress_percent: 50,
  tags: ['travel', 'beginner', 'essential'],
}

const deckNoDescription: DeckCardProps['deck'] = {
  ...baseDeck,
  id: 2,
  name: 'Quick Deck',
  description: null,
  learned_count: 5,
  progress_percent: 25,
  tags: ['quick'],
}

const deckNoTags: DeckCardProps['deck'] = {
  ...baseDeck,
  id: 3,
  name: 'Untagged Deck',
  learned_count: 15,
  progress_percent: 75,
  tags: [],
}

const deckManyTags: DeckCardProps['deck'] = {
  ...baseDeck,
  id: 4,
  name: 'Well-Tagged Deck',
  learned_count: 8,
  progress_percent: 40,
  tags: ['travel', 'beginner', 'essential', 'common', 'frequent', 'useful'],
}

const deckZeroCards: DeckCardProps['deck'] = {
  ...baseDeck,
  id: 5,
  name: 'Empty Deck',
  description: 'A deck with no cards',
  card_count: 0,
  learned_count: 0,
  progress_percent: 0,
  tags: [],
}

const deckAllLearned: DeckCardProps['deck'] = {
  ...baseDeck,
  id: 6,
  name: 'Completed Deck',
  description: 'All cards have been learned',
  learned_count: 20,
  progress_percent: 100,
  tags: ['completed'],
}

const deckLowProgress: DeckCardProps['deck'] = {
  ...baseDeck,
  id: 7,
  name: 'New Deck',
  description: 'Just started learning',
  learned_count: 2,
  progress_percent: 10,
  tags: ['new', 'beginner'],
}

const deckHighProgress: DeckCardProps['deck'] = {
  ...baseDeck,
  id: 8,
  name: 'Almost Complete',
  description: 'Nearly all cards learned',
  learned_count: 17,
  progress_percent: 85,
  tags: ['advanced', 'progress'],
}

const handleClick = (deckId: number) => {
  console.log(`Clicked deck: ${deckId}`)
}

/**
 * Default DeckCard with sample deck
 */
export const Default: Story = {
  args: {
    deck: sampleDeck,
    onClick: handleClick,
  },
}

/**
 * Deck with no description
 */
export const NoDescription: Story = {
  args: {
    deck: deckNoDescription,
    onClick: handleClick,
  },
}

/**
 * Deck with no tags
 */
export const NoTags: Story = {
  args: {
    deck: deckNoTags,
    onClick: handleClick,
  },
}

/**
 * Deck with many tags (more than 3)
 */
export const ManyTags: Story = {
  args: {
    deck: deckManyTags,
    onClick: handleClick,
  },
}

/**
 * Deck with zero cards
 */
export const EmptyDeck: Story = {
  args: {
    deck: deckZeroCards,
    onClick: handleClick,
  },
}

/**
 * Deck with all cards learned (100% progress)
 */
export const AllLearned: Story = {
  args: {
    deck: deckAllLearned,
    onClick: handleClick,
  },
}

/**
 * Deck with low progress (0-33%) - red progress bar
 */
export const LowProgress: Story = {
  args: {
    deck: deckLowProgress,
    onClick: handleClick,
  },
}

/**
 * Deck with medium progress (34-66%) - orange progress bar
 */
export const MediumProgress: Story = {
  args: {
    deck: sampleDeck,
    onClick: handleClick,
  },
}

/**
 * Deck with high progress (67-100%) - green progress bar
 */
export const HighProgress: Story = {
  args: {
    deck: deckHighProgress,
    onClick: handleClick,
  },
}

/**
 * Deck with long name and description
 */
export const LongContent: Story = {
  args: {
    deck: {
      ...baseDeck,
      id: 9,
      name: 'The Very Comprehensive and Extensive Travel Vocabulary Collection',
      description: 'This deck contains all the essential words and phrases you will need when traveling to French-speaking countries, including greetings, directions, transportation, accommodations, dining, and emergency situations.',
      learned_count: 15,
      progress_percent: 75,
      tags: ['travel', 'comprehensive', 'essential'],
    },
    onClick: handleClick,
  },
}

/**
 * Deck with special characters in name and description
 */
export const SpecialCharacters: Story = {
  args: {
    deck: {
      ...baseDeck,
      id: 10,
      name: 'French & "Special" Characters <Deck>',
      description: 'A deck with special characters: &, "<>", \'apostrophes\', and more!',
      learned_count: 5,
      progress_percent: 25,
      tags: ['special', 'characters'],
    },
    onClick: handleClick,
  },
}

/**
 * Deck with minimal information
 */
export const MinimalInfo: Story = {
  args: {
    deck: {
      ...baseDeck,
      id: 11,
      name: 'Minimal',
      description: null,
      card_count: 5,
      learned_count: 0,
      progress_percent: 0,
      tags: [],
    },
    onClick: handleClick,
  },
}
