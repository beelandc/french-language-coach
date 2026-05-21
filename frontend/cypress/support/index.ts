// Cypress Support File
// This file is automatically imported by Cypress before each test file

// Import commands
import './commands'

// TypeScript support
import '@testing-library/cypress' // For user event helpers

// Declare global types for Cypress
declare global {
  namespace Cypress {
    interface Chainable {
      // Custom commands
      selectScenario(scenarioId: string): Chainable<Element>
      sendMessage(content: string): Chainable<Element>
      endSession(): Chainable<Element>
      getFeedbackScore(scoreType: 'grammar' | 'vocabulary' | 'fluency' | 'overall'): Chainable<Element>
      waitForRoute(route: string): Chainable<Element>
      
      // Additional type-safe selectors
      getByTestId(testId: string): Chainable<Element>
    }
  }
}

// Add type-safe getByTestId command
Cypress.Commands.add('getByTestId', { prevSubject: 'optional' }, (subject, testId) => {
  return cy.get(`[data-testid="${testId}"]`)
})

// Global before hooks
before(() => {
  // Run before all tests
  console.log('Cypress tests starting...')
})

// Global after hooks
after(() => {
  // Run after all tests
  console.log('Cypress tests completed')
})
