import type { Meta, StoryObj } from '@storybook/react'
import ScenarioSelector from './ScenarioSelector'
import { MockSessionsProvider } from '../utils/storybookMocks'

const meta: Meta<typeof ScenarioSelector> = {
  title: 'Components/ScenarioSelector',
  component: ScenarioSelector,
  tags: ['autodocs'],
  argTypes: {
    // ScenarioSelector doesn't accept props - it manages its own state
  },
  parameters: {
    docs: {
      description: {
        component: 'A grid of scenario cards that allows users to select a conversation scenario. Handles loading states and error display.',
      },
    },
  },
}

export default meta

type Story = StoryObj<typeof meta>

// Since ScenarioSelector manages its own state and doesn't accept props,
// we can only show it in its default state
// The component handles scenario selection internally
export const Default: Story = {
  args: {},
  decorators: [
    (Story) => (
      <MockSessionsProvider initialSessions={[]} currentSessionId={null} currentScenarioId={null}>
        <Story />
      </MockSessionsProvider>
    ),
  ],
}
