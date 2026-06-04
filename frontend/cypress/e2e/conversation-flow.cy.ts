/// <reference types="cypress" />

// Cypress E2E Tests for Issue #27: Complete Conversation Flow
// Tests the user journey: select scenario -> chat -> feedback

describe('Conversation Flow - Issue #27', () => {
  const SESSION_ID = 1
  const SCENARIO_ID = 'cafe_order'
  
  // Mock data from fixtures
  const testMessages = [
    { user: 'Bonjour, je voudrais un café', assistant: 'Bonjour ! Quel type de café souhaitez-vous ?' },
    { user: 'Un café noir, s\'il vous plaît', assistant: 'Très bien. Avec du sucre ?' },
    { user: 'Non, sans sucre merci', assistant: 'Parfait. Cela fera 2,50 euros.' },
  ]

  beforeEach(() => {
    // Visit the home page before each test
    cy.visit('/')
    
    // Wait for scenarios to load
    cy.getByTestId('scenario-selector', { timeout: 10000 }).should('exist')
    
    // Mock API endpoints
    mockAllApiEndpoints()
  })

  /**
   * Mock all API endpoints needed for the conversation flow
   */
  function mockAllApiEndpoints() {
    // Mock session creation
    cy.intercept('POST', '/sessions/', {
      id: SESSION_ID,
      scenario_id: SCENARIO_ID,
      created_at: '2024-01-01T00:00:00Z',
    }).as('createSession')

    // Mock message sending - return AI response
    cy.intercept('POST', `/sessions/${SESSION_ID}/messages/`, (req) => {
      // Return a mock AI response based on the user message
      const userMessage = req.body.content
      let aiResponse = 'Mock AI response'
      
      // Custom responses based on message content
      if (userMessage.includes('café') || userMessage.includes('cafe')) {
        aiResponse = 'Bonjour ! Quel type de café souhaitez-vous ?'
      } else if (userMessage.includes('noir')) {
        aiResponse = 'Très bien. Avec du sucre ?'
      } else if (userMessage.includes('sucre')) {
        aiResponse = 'Parfait. Cela fera 2,50 euros.'
      }
      
      req.reply({
        role: 'assistant',
        content: aiResponse,
        session_id: SESSION_ID,
      })
    }).as('sendMessage')

    // Mock feedback endpoint
    cy.intercept('POST', `/sessions/${SESSION_ID}/feedback/`, {
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
    }).as('getFeedback')

    // Mock session locking endpoints
    cy.intercept('POST', `/sessions/${SESSION_ID}/lock`, {
      id: SESSION_ID,
      is_locked: true,
      locked_at: '2024-01-01T00:00:00Z',
      locked_by: 'test-client',
    })

    cy.intercept('POST', `/sessions/${SESSION_ID}/unlock`, {
      id: SESSION_ID,
      is_locked: false,
      locked_at: null,
      locked_by: null,
    })
  }

  // ============================================
  // ACCEPTANCE CRITERIA TESTS
  // ============================================

  // AC-1: Test scenario selection
  describe('AC-1: Scenario Selection', () => {
    it('should navigate to chat page when user selects a scenario', () => {
      // Given: User is on the home page
      cy.shouldBeOnPage('home')
      cy.getByTestId('scenario-selector').should('exist')
      cy.getByTestId('scenarios-grid').should('exist')

      // When: User clicks on a scenario
      cy.getByTestId(`scenario-${SCENARIO_ID}`).click()

      // Then: User is navigated to chat page
      cy.wait('@createSession')
      cy.url().should('include', `/chat/${SESSION_ID}`)
      cy.shouldBeOnPage('chat')
      cy.getByTestId('chat-interface').should('exist')
    })

    it('should display all available scenarios', () => {
      // Given: User is on the home page
      cy.shouldBeOnPage('home')

      // When/Then: All scenarios are visible
      cy.getByTestId('scenario-cafe_order').should('exist')
      cy.getByTestId('scenario-ask_directions').should('exist')
      cy.getByTestId('scenario-job_interview').should('exist')
    })
  })

  // AC-2: Test starting a session
  describe('AC-2: Starting a Session', () => {
    it('should create a new session when scenario is selected', () => {
      // Given: User is on the home page
      cy.shouldBeOnPage('home')

      // When: User selects a scenario
      cy.getByTestId(`scenario-${SCENARIO_ID}`).click()

      // Then: A new session is created with the selected scenario
      cy.wait('@createSession').then((interception) => {
        const request = interception.request
        const response = interception.response
        
        // Verify request body
        expect(request.body).to.have.property('scenario_id', SCENARIO_ID)
        
        // Verify response
        expect(response?.body).to.have.property('id', SESSION_ID)
        expect(response?.body).to.have.property('scenario_id', SCENARIO_ID)
        expect(response?.body).to.have.property('created_at')
      })
      
      // And user is on chat page
      cy.shouldBeOnPage('chat')
    })

    it('should display the correct scenario name in chat header', () => {
      // Given: User selects a scenario
      cy.getByTestId(`scenario-${SCENARIO_ID}`).click()
      cy.wait('@createSession')

      // When: User is on chat page
      cy.shouldBeOnPage('chat')

      // Then: Scenario name is displayed
      cy.getByTestId('chat-scenario-name').should('contain', 'Ordering at a Café')
    })
  })

  // AC-3: Test sending multiple messages
  describe('AC-3: Sending Multiple Messages', () => {
    it('should send multiple messages and display them in chat', () => {
      // Given: User has started a session
      cy.getByTestId(`scenario-${SCENARIO_ID}`).click()
      cy.wait('@createSession')
      cy.shouldBeOnPage('chat')

      // When: User sends first message
      cy.getByTestId('message-input').type(testMessages[0].user)
      cy.getByTestId('send-button').click()
      cy.wait('@sendMessage')

      // Then: First user message is displayed
      cy.get('body').should('contain', testMessages[0].user)

      // When: User sends second message
      cy.getByTestId('message-input').type(testMessages[1].user)
      cy.getByTestId('send-button').click()
      cy.wait('@sendMessage')

      // Then: Second user message is displayed
      cy.get('body').should('contain', testMessages[1].user)

      // When: User sends third message
      cy.getByTestId('message-input').type(testMessages[2].user)
      cy.getByTestId('send-button').click()
      cy.wait('@sendMessage')

      // Then: Third user message is displayed
      cy.get('body').should('contain', testMessages[2].user)
    })

    it('should clear input field after sending message', () => {
      // Given: User has started a session
      cy.getByTestId(`scenario-${SCENARIO_ID}`).click()
      cy.wait('@createSession')
      cy.shouldBeOnPage('chat')

      // When: User types and sends a message
      cy.getByTestId('message-input').type(testMessages[0].user)
      cy.getByTestId('send-button').click()
      cy.wait('@sendMessage')

      // Then: Input field is cleared
      cy.getByTestId('message-input').should('have.value', '')
    })

    it('should display messages in correct order', () => {
      // Given: User has started a session
      cy.getByTestId(`scenario-${SCENARIO_ID}`).click()
      cy.wait('@createSession')
      cy.shouldBeOnPage('chat')

      // When: User sends multiple messages
      const messages = [
        'First message',
        'Second message',
        'Third message',
      ]
      
      messages.forEach((msg) => {
        cy.getByTestId('message-input').type(msg)
        cy.getByTestId('send-button').click()
        cy.wait('@sendMessage')
      })

      // Then: Messages appear in order (first message should appear before second, etc.)
      cy.get('body').then(($body) => {
        const text = $body.text()
        const firstIndex = text.indexOf('First message')
        const secondIndex = text.indexOf('Second message')
        const thirdIndex = text.indexOf('Third message')
        
        expect(firstIndex).to.be.lessThan(secondIndex)
        expect(secondIndex).to.be.lessThan(thirdIndex)
      })
    })
  })

  // AC-4: Test receiving AI responses
  describe('AC-4: Receiving AI Responses', () => {
    it('should display AI responses after user sends messages', () => {
      // Given: User has started a session
      cy.getByTestId(`scenario-${SCENARIO_ID}`).click()
      cy.wait('@createSession')
      cy.shouldBeOnPage('chat')

      // When: User sends a message
      cy.getByTestId('message-input').type(testMessages[0].user)
      cy.getByTestId('send-button').click()
      cy.wait('@sendMessage')

      // Then: AI response is displayed
      cy.get('body').should('contain', 'Bonjour ! Quel type de café souhaitez-vous ?')
    })

    it('should show AI responses for each user message', () => {
      // Given: User has started a session
      cy.getByTestId(`scenario-${SCENARIO_ID}`).click()
      cy.wait('@createSession')
      cy.shouldBeOnPage('chat')

      // When: User sends a message about ordering coffee
      cy.getByTestId('message-input').type('café')
      cy.getByTestId('send-button').click()
      cy.wait('@sendMessage')

      // Then: AI responds with coffee-related message
      cy.get('body').should('contain', 'café')
    })

    it('should display both user and AI messages in chat', () => {
      // Given: User has started a session
      cy.getByTestId(`scenario-${SCENARIO_ID}`).click()
      cy.wait('@createSession')
      cy.shouldBeOnPage('chat')

      // When: User sends a message
      const userMessage = testMessages[0].user
      cy.getByTestId('message-input').type(userMessage)
      cy.getByTestId('send-button').click()
      cy.wait('@sendMessage')

      // Then: Both user message and AI response are visible
      cy.get('body').should('contain', userMessage)
      // The message contains "café" so the mock should return the coffee response
      cy.get('body').should('contain', 'Quel type de café souhaitez-vous')
    })
  })

  // AC-5: Test ending session
  describe('AC-5: Ending Session', () => {
    it('should navigate to feedback page when user ends session', () => {
      // Given: User is in an active chat session
      cy.getByTestId(`scenario-${SCENARIO_ID}`).click()
      cy.wait('@createSession')
      cy.shouldBeOnPage('chat')

      // When: User clicks "End Session"
      cy.getByTestId('end-session-button').click()

      // Then: User is navigated to feedback page
      cy.wait('@getFeedback')
      cy.url().should('include', `/feedback/${SESSION_ID}`)
      cy.shouldBeOnPage('feedback')
    })

    it('should display feedback page after ending session', () => {
      // Given: User is in a chat session
      cy.getByTestId(`scenario-${SCENARIO_ID}`).click()
      cy.wait('@createSession')
      cy.shouldBeOnPage('chat')

      // When: User ends the session
      cy.getByTestId('end-session-button').click()
      cy.wait('@getFeedback')

      // Then: Feedback page is displayed
      cy.getByTestId('feedback-view').should('exist')
    })
  })

  // AC-6: Test feedback display
  describe('AC-6: Feedback Display', () => {
    it('should display all score categories', () => {
      // Given: User has ended a session and is on feedback page
      cy.getByTestId(`scenario-${SCENARIO_ID}`).click()
      cy.wait('@createSession')
      cy.getByTestId('end-session-button').click()
      cy.wait('@getFeedback')
      cy.shouldBeOnPage('feedback')

      // Then: All score categories are displayed
      cy.getFeedbackScore('grammar').should('exist').and('contain', '85')
      cy.getFeedbackScore('vocabulary').should('exist').and('contain', '90')
      cy.getFeedbackScore('fluency').should('exist').and('contain', '80')
      cy.getFeedbackScore('overall').should('exist').and('contain', '85')
    })

    it('should display strengths section', () => {
      // Given: User is on feedback page
      cy.getByTestId(`scenario-${SCENARIO_ID}`).click()
      cy.wait('@createSession')
      cy.getByTestId('end-session-button').click()
      cy.wait('@getFeedback')
      cy.shouldBeOnPage('feedback')

      // Then: Strengths are displayed
      cy.getByTestId('strengths-section').should('exist')
      cy.getByTestId('strengths-list').should('exist')
      cy.get('body').should('contain', 'Good vocabulary usage')
      cy.get('body').should('contain', 'Clear sentence structure')
    })

    it('should display focus area section', () => {
      // Given: User is on feedback page
      cy.getByTestId(`scenario-${SCENARIO_ID}`).click()
      cy.wait('@createSession')
      cy.getByTestId('end-session-button').click()
      cy.wait('@getFeedback')
      cy.shouldBeOnPage('feedback')

      // Then: Focus area is displayed
      cy.getByTestId('focus-area-section').should('exist')
      cy.getByTestId('focus-area-priority').should('contain', 'Improve your grammar')
    })

    it('should display example corrections if available', () => {
      // Given: User is on feedback page
      cy.getByTestId(`scenario-${SCENARIO_ID}`).click()
      cy.wait('@createSession')
      cy.getByTestId('end-session-button').click()
      cy.wait('@getFeedback')
      cy.shouldBeOnPage('feedback')

      // Then: Corrections are displayed
      cy.getByTestId('corrections-section').should('exist')
      cy.get('body').should('contain', 'Je vais au cafe')
      cy.get('body').should('contain', 'Je vais au café')
    })

    it('should display feedback header with actions', () => {
      // Given: User is on feedback page
      cy.getByTestId(`scenario-${SCENARIO_ID}`).click()
      cy.wait('@createSession')
      cy.getByTestId('end-session-button').click()
      cy.wait('@getFeedback')
      cy.shouldBeOnPage('feedback')

      // Then: Feedback header and actions are displayed
      cy.getByTestId('feedback-header').should('exist')
      cy.getByTestId('feedback-actions').should('exist')
      cy.getByTestId('back-to-chat-button').should('exist')
      cy.getByTestId('new-session-button').should('exist')
      cy.getByTestId('export-pdf-button').should('exist')
    })
  })

  // ============================================
  // COMPLETE FLOW TESTS
  // ============================================

  describe('Complete Conversation Flow', () => {
    it('should complete the entire flow: scenario selection -> chat -> feedback', () => {
      // Step 1: User is on home page
      cy.shouldBeOnPage('home')

      // Step 2: User selects a scenario
      cy.getByTestId(`scenario-${SCENARIO_ID}`).click()
      cy.wait('@createSession')
      cy.shouldBeOnPage('chat')
      cy.getByTestId('chat-interface').should('exist')

      // Step 3: User sends first message
      cy.getByTestId('message-input').type(testMessages[0].user)
      cy.getByTestId('send-button').click()
      cy.wait('@sendMessage')
      cy.get('body').should('contain', testMessages[0].user)

      // Step 4: User sends second message
      cy.getByTestId('message-input').type(testMessages[1].user)
      cy.getByTestId('send-button').click()
      cy.wait('@sendMessage')
      cy.get('body').should('contain', testMessages[1].user)

      // Step 5: User ends session
      cy.getByTestId('end-session-button').click()
      cy.wait('@getFeedback')
      cy.shouldBeOnPage('feedback')

      // Step 6: Verify feedback is displayed
      cy.getFeedbackScore('grammar').should('contain', '85')
      cy.getFeedbackScore('vocabulary').should('contain', '90')
      cy.getFeedbackScore('fluency').should('contain', '80')
      cy.getFeedbackScore('overall').should('contain', '85')
    })
  })

  // ============================================
  // EDGE CASE TESTS
  // ============================================

  describe('Edge Cases', () => {
    it('should handle empty message input', () => {
      // Given: User is in a chat session
      cy.getByTestId(`scenario-${SCENARIO_ID}`).click()
      cy.wait('@createSession')
      cy.shouldBeOnPage('chat')

      // When: User tries to send empty message
      cy.getByTestId('message-input').type('   ')
      cy.getByTestId('send-button').click()

      // Then: Empty message is not sent (frontend validation)
      // The input should still be focused or show error
      // Note: This depends on frontend validation implementation
      cy.getByTestId('message-input').should('have.value', '   ')
    })

    it('should display navigation buttons correctly', () => {
      // Given: User is in a chat session
      cy.getByTestId(`scenario-${SCENARIO_ID}`).click()
      cy.wait('@createSession')
      cy.shouldBeOnPage('chat')

      // Then: Navigation buttons are present
      cy.getByTestId('back-button').should('exist')
      cy.getByTestId('end-session-button').should('exist')

      // When: User clicks back
      cy.getByTestId('back-button').click()

      // Then: User returns to home page
      cy.shouldBeOnPage('home')
    })

    it('should display session scenario name correctly', () => {
      // Given: User selects a scenario
      cy.getByTestId(`scenario-${SCENARIO_ID}`).click()
      cy.wait('@createSession')

      // Then: Scenario name is displayed in chat header
      cy.getByTestId('chat-scenario-name').should('contain', 'Ordering at a Café')
    })
  })

  // ============================================
  // ROUTING TESTS
  // ============================================

  describe('Routing', () => {
    it('should navigate directly to chat page with session ID', () => {
      // Given: User visits chat page directly
      // Mock the session list endpoint (used by useSessions hook)
      cy.intercept('GET', '/sessions/?*', {
        sessions: [
          {
            id: SESSION_ID,
            scenario_id: SCENARIO_ID,
            scenario_name: 'Ordering at a Café',
            difficulty: 'intermediate',
            created_at: '2024-01-01T00:00:00Z',
            ended_at: null,
            messages: [],
            feedback: null,
            is_locked: false,
            locked_at: null,
            locked_by: null,
          },
        ],
        pagination: { total: 1, page: 1, per_page: 10, total_pages: 1 },
      })

      // Mock session lock/unlock endpoints (ChatInterface locks session on mount)
      cy.intercept('POST', `/sessions/${SESSION_ID}/lock`, {
        id: SESSION_ID,
        is_locked: true,
        locked_at: '2024-01-01T00:00:00Z',
        locked_by: 'test-client',
      })

      cy.intercept('POST', `/sessions/${SESSION_ID}/unlock`, {
        id: SESSION_ID,
        is_locked: false,
        locked_at: null,
        locked_by: null,
      })

      cy.visit(`/chat/${SESSION_ID}`)

      // Then: Chat page is displayed
      cy.shouldBeOnPage('chat')
      cy.getByTestId('chat-interface').should('exist')
    })

    it('should navigate directly to feedback page with session ID', () => {
      // Given: User visits feedback page directly
      // Mock the session list endpoint (used by useSessions hook)
      cy.intercept('GET', '/sessions/?*', {
        sessions: [],
        pagination: { total: 0, page: 1, per_page: 10, total_pages: 0 },
      })

      // Mock the session GET endpoint to avoid 404/502 errors
      cy.intercept('GET', `/sessions/${SESSION_ID}`, {
        id: SESSION_ID,
        scenario_id: SCENARIO_ID,
        scenario_name: 'Ordering at a Café',
        difficulty: 'intermediate',
        created_at: '2024-01-01T00:00:00Z',
        ended_at: '2024-01-01T00:05:00Z',
        messages: [],
        feedback: {
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
        },
        is_locked: false,
        locked_at: null,
        locked_by: null,
      }).as('getSession')

      // Mock the feedback POST endpoint (FeedbackView calls getFeedback on mount)
      cy.intercept('POST', `/sessions/${SESSION_ID}/feedback/`, {
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
      }).as('getFeedback')

      cy.visit(`/feedback/${SESSION_ID}`)

      // Then: Feedback page is displayed
      cy.shouldBeOnPage('feedback')
      cy.wait(['@getSession', '@getFeedback'])
    })
  })
})
