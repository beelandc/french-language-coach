import type { Meta, StoryObj } from '@storybook/react'
import CorrectionItem from './CorrectionItem'
import type { Correction } from '@/types'

const meta: Meta<typeof CorrectionItem> = {
  title: 'Components/CorrectionItem',
  component: CorrectionItem,
  tags: ['autodocs'],
  argTypes: {
    correction: {
      description: 'The correction data to display',
      type: { required: true },
      table: {
        type: { summary: 'Correction' },
      },
    },
  },
}

export default meta

type Story = StoryObj<typeof meta>

const mockCorrection: Correction = {
  original: 'Je veux un café',
  corrected: 'Je voudrais un café',
  explanation: 'Using "voudrais" (conditional) is more polite than "veux" (present) when making requests.',
}

const mockCorrection2: Correction = {
  original: 'Je suis allé au musée hier',
  corrected: 'Je suis allée au musée hier',
  explanation: 'The past participle "allée" must agree with the subject (feminine) in compound tenses.',
}

const mockCorrection3: Correction = {
  original: 'Il faut que tu viens',
  corrected: 'Il faut que tu viennes',
  explanation: 'After "que" in expressions of necessity, the subjunctive mood is required: "viennes" instead of "viens".',
}

export const Default: Story = {
  args: {
    correction: mockCorrection,
  },
}

export const GenderAgreement: Story = {
  args: {
    correction: mockCorrection2,
  },
}

export const Subjunctive: Story = {
  args: {
    correction: mockCorrection3,
  },
}

export const LongExplanation: Story = {
  args: {
    correction: {
      original: 'Je ne sais pas',
      corrected: 'Je ne sais pas du tout',
      explanation: 'To emphasize "I don\'t know at all," French speakers commonly add "du tout" at the end. This is a more idiomatic and natural way to express complete uncertainty or lack of knowledge in everyday conversation.',
    },
  },
}
