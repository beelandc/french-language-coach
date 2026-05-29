/// <reference types="cypress" />

// Custom Cypress commands for French Language Coach E2E tests

// Define Feedback type for use in commands
interface Feedback {
  grammar_score: number
  vocabulary_score: number
  fluency_score: number
  overall_score: number
  strengths: string[]
  focus_area: string
  example_corrections: {
    original: string
    corrected: string
    explanation: string
  }[]
}

// Command to select a scenario from the home page
Cypress.Commands.add('selectScenario', (scenarioId: string) => {
  cy.getByTestId(`scenario-${scenarioId}`).click()
})

// Command to send a message in the chat
Cypress.Commands.add('sendMessage', (content: string) => {
  cy.getByTestId('message-input').type(content)
  cy.getByTestId('send-button').click()
})

// Command to end the current session
Cypress.Commands.add('endSession', () => {
  cy.getByTestId('end-session-button').click()
})

// Command to get a specific feedback score element
Cypress.Commands.add('getFeedbackScore', (scoreType: 'grammar' | 'vocabulary' | 'fluency' | 'overall') => {
  return cy.getByTestId(`${scoreType}-score`)
})

// Command to wait for a specific route
Cypress.Commands.add('waitForRoute', (route: string) => {
  cy.url().should('include', route)
})

// Command to verify we're on a specific page
Cypress.Commands.add('shouldBeOnPage', (page: 'home' | 'chat' | 'feedback') => {
  cy.getByTestId(`${page}-page`).should('exist')
})

// Command to wait for loading to complete
Cypress.Commands.add('waitForLoadingComplete', () => {
  // Wait for any loading spinners to disappear
  cy.getByTestId('loading-spinner', { timeout: 1000 }).should('not.exist')
  cy.getByTestId('loading-scenarios', { timeout: 1000 }).should('not.exist')
  cy.getByTestId('loading-feedback', { timeout: 1000 }).should('not.exist')
})

// Command to mock the session creation API
Cypress.Commands.add('mockSessionCreation', (sessionId: number = 1, scenarioId: string = 'cafe_order') => {
  cy.intercept('POST', '/sessions/', {
    id: sessionId,
    scenario_id: scenarioId,
    created_at: '2024-01-01T00:00:00Z',
  }).as('createSession')
})

// Command to mock sending a message
Cypress.Commands.add('mockMessageResponse', (sessionId: number = 1, content: string = 'Mock AI response') => {
  cy.intercept('POST', `/sessions/${sessionId}/messages/`, {
    role: 'assistant',
    content: content,
    session_id: sessionId,
  }).as('sendMessage')
})

// Command to mock feedback response
Cypress.Commands.add('mockFeedbackResponse', (sessionId: number = 1, feedbackData?: Partial<Feedback>) => {
  const defaultFeedback = {
    grammar_score: 85,
    vocabulary_score: 90,
    fluency_score: 80,
    overall_score: 85,
    strengths: ['Good vocabulary usage', 'Clear sentence structure'],
    focus_area: 'grammar',
    example_corrections: [
      {
        original: 'Je vais au cafe',
        corrected: 'Je vais au café',
        explanation: 'Accent needed on café',
      },
    ],
  }
  
  const feedback = { ...defaultFeedback, ...feedbackData }
  cy.intercept('POST', `/sessions/${sessionId}/feedback/`, feedback).as('getFeedback')
})

// Type definitions for Cypress
declare global {
  namespace Cypress {
    interface Chainable {
      selectScenario(scenarioId: string): Chainable<Element>
      sendMessage(content: string): Chainable<Element>
      endSession(): Chainable<Element>
      getFeedbackScore(scoreType: 'grammar' | 'vocabulary' | 'fluency' | 'overall'): Chainable<Element>
      waitForRoute(route: string): Chainable<Element>
      shouldBeOnPage(page: 'home' | 'chat' | 'feedback'): Chainable<Element>
      waitForLoadingComplete(): Chainable<Element>
      mockSessionCreation(sessionId?: number, scenarioId?: string): Chainable<void>
      mockMessageResponse(sessionId?: number, content?: string): Chainable<void>
      mockFeedbackResponse(sessionId?: number, feedbackData?: Partial<Feedback>): Chainable<void>
    }
  }
}
