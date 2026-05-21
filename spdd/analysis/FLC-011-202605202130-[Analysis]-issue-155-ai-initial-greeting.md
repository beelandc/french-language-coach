# SPDD Analysis: AI Initial Greeting in Chat Simulations

**GitHub Issue**: #155
**Issue Title**: feat: AI should provide initial greeting in chat simulations
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/155
**Artifact ID**: FLC-011-202605202130-[Analysis]-issue-155-ai-initial-greeting
**Created**: 2026-05-20 21:30
**Author**: Mistral Vibe

---

## Original Business Requirement

From GitHub issue #155:

Currently, during chat scenarios, the user must send the first message to initiate the conversation. This requires the user to come up with an opening line, which may not be ideal for practice scenarios where we want to simulate a natural conversation flow.

**Proposed Change**: Modify the chat simulation behavior so that the AI automatically provides the initial greeting/message to start the chat. The user would then respond to the AI's opening message, creating a more natural conversation flow.

**Current Behavior:**
- User starts chat
- User must type and send first message
- AI responds to user's message

**Desired Behavior:**
- User starts chat
- AI automatically sends initial greeting/question
- User responds to AI's message
- Conversation continues naturally

---

## Background

The French Language Coach application provides immersive AI conversation scenarios for French language learners. Currently, users must initiate conversations by typing their own opening message. This creates friction because:

1. Language learners may not know appropriate opening phrases for different scenarios
2. Real-world conversations often have the other party initiate
3. The user experience is less immersive when users must "break the ice" themselves

By having the AI send the first message, we create a more natural and realistic conversation flow that better prepares learners for actual French interactions.

---

## Business Value

- **Improved User Experience**: Reduces friction for users who may not know how to start a conversation in French
- **More Natural Practice**: Better simulates real-world scenarios where the other party (waiter, receptionist, shopkeeper) often initiates
- **Lower Barrier to Entry**: Beginners can start practicing immediately without needing to know opening phrases
- **Better Immersion**: Creates a more seamless transition into the role-play scenario

---

## Scope In

- [ ] AI automatically sends first message when a new chat session is created and user navigates to chat page
- [ ] Initial greeting is contextually appropriate for the selected scenario and difficulty level
- [ ] User can respond normally to the AI's initial message
- [ ] Initial greeting appears in the chat interface before the user types anything
- [ ] Existing chat functionality (sendMessage, receive response, etc.) remains unchanged

## Scope Out

- [ ] Customization of initial greetings by users (future enhancement)
- [ ] Multiple initial message options per scenario (future enhancement)
- [ ] AI personality customization for initial greetings (future enhancement)
- [ ] Changes to existing session creation API (will be backward compatible)
- [ ] Changes to feedback generation logic

---

## Acceptance Criteria (ACs)

From GitHub issue #155:

1. **AC1**: AI sends first message automatically when chat simulation starts
   **Given** A user navigates to a new chat session page
   **When** The ChatInterface component mounts with a valid sessionId
   **Then** An AI greeting message appears in the chat

2. **AC2**: Initial greeting is contextually appropriate for the scenario
   **Given** A session with scenario_id "cafe_order"
   **When** The chat starts
   **Then** The AI's first message should be a greeting appropriate for a café server

3. **AC3**: User can respond normally to the AI's initial message
   **Given** A chat session with an AI greeting already displayed
   **When** The user types and sends a message
   **Then** The AI responds appropriately to the user's message

4. **AC4**: Existing chat functionality remains unchanged
   **Given** Existing chat sessions (created before this feature)
   **When** User sends messages
   **Then** All existing functionality works as before

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **Session**: Database entity storing conversation history, stored in `models/session.py`, created via `POST /sessions/`
- **Message**: Individual chat messages with role (user/assistant) and content, stored within Session
- **Scenario**: Predefined conversation contexts with system prompts in `scenarios.py`
- **MistralClient**: Service in `services/mistral.py` that handles AI chat completions
- **ChatInterface**: React component in `frontend/src/components/ChatInterface.tsx` that displays messages and handles user input
- **useSessions**: Custom hook in `frontend/src/hooks/useSessions.tsx` managing session state and API calls
- **createSession**: API endpoint and hook function that creates new chat sessions
- **sendMessage**: API endpoint and hook function that sends user messages and gets AI responses

### New Concepts Required

- **Initial AI Message**: A special message sent automatically when a session starts, before any user input
- **Session Initialization Flow**: Enhanced flow where creating/navigating to a session triggers AI greeting generation

### Key Business Rules

- **Rule 1**: Initial greeting must be generated using the scenario's system prompt to maintain consistency
- **Rule 2**: Initial greeting should be the first message in a new session (no user message before it)
- **Rule 3**: Only new sessions should get an initial greeting (not sessions being continued)
- **Rule 4**: The greeting should be contextually appropriate for the scenario type and difficulty level

---

## Strategic Approach

### Solution Direction

The feature requires changes at multiple layers:

1. **Backend** (`routers/messages.py` or `routers/sessions.py`): 
   - Add endpoint or modify existing endpoint to generate initial AI greeting when session is created
   - OR: Add endpoint to fetch initial greeting for a session

2. **Frontend** (`frontend/src/hooks/useSessions.tsx`):
   - Modify `createSession` to also fetch/generate initial AI greeting
   - Add state to track whether initial greeting has been sent

3. **Frontend** (`frontend/src/components/ChatInterface.tsx`):
   - Display initial greeting when session loads
   - Handle the case where messages array has the initial AI message

**Recommended Approach**: Modify the `createSession` endpoint to return the initial AI greeting along with the session data. This keeps the flow simple:
1. User selects scenario → `createSession` called
2. Backend creates session AND generates first AI message
3. Frontend displays session with initial message already present

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| Where to generate initial greeting | Backend: More consistent, uses same system prompt logic. Frontend: Reduces backend changes, but would need to duplicate AI calling logic | **Backend** - Keep AI logic centralized |
| When to generate greeting | At session creation vs. when user navigates to chat | **At session creation** - Ensures greeting is always there when user arrives |
| How to store greeting | As first message in session vs. separate field | **As first message** - Consistent with existing message storage, no schema changes |
| Difficulty level for greeting | Use session difficulty vs. always intermediate | **Use session difficulty** - Matches user's selected level |

### Alternatives Considered

- **Alternative 1**: Generate greeting in frontend after session creation
  - Rejected because it would require duplicating the scenario system prompt logic in TypeScript or making an additional API call
  
- **Alternative 2**: Add a separate endpoint `POST /sessions/{id}/init` to generate first message
  - Rejected because it adds an extra API call and complicates the flow
  
- **Alternative 3**: Modify the existing messages endpoint to handle empty session
  - Rejected because it conflates two concerns: user-initiated messages vs. system-initiated greeting

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| What if user refreshes the page? | Should initial greeting be re-generated or loaded from session? | Load from session - the greeting is part of the session history |
| What about existing sessions? | Should they get initial greetings retroactively? | No - only new sessions. Existing sessions maintain current behavior |
| Should greeting vary by difficulty? | The scenario system prompts already vary by difficulty | Yes - use the session's difficulty level |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| User refreshes chat page | Greeting should still appear | Load greeting from session messages |
| User navigates back and forth | Greeting should only appear once | Check if session already has messages |
| Session creation fails | Don't show chat interface | Error handling in existing flow |
| AI greeting generation fails | Don't break session creation | Return session without greeting, show error |
| Multiple rapid session creations | Race condition possible | Existing async handling should work |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Breaking existing tests | Tests may expect empty message list for new sessions | Update tests to expect initial greeting |
| Backend API versioning | Existing clients may not expect initial message | Make it optional/backward compatible |
| AI latency at session creation | Slower session start | Show loading state in frontend |
| Empty scenario system prompt | Greeting might be generic or broken | Validate scenario exists before creating session |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | AI sends first message automatically | Yes | Covered by backend modification |
| AC2 | Greeting contextually appropriate | Yes | Using scenario system prompts ensures this |
| AC3 | User can respond normally | Yes | Existing sendMessage handles this |
| AC4 | Existing functionality unchanged | Yes | Backward compatible - old sessions work as before |

**AC Coverage Summary**: All 4 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- Initial greeting should appear without user refresh
- Initial greeting should be stored as part of session history
- Error handling for greeting generation failures

---

## REASONS Canvas

### Requirements
From GitHub issue #155 acceptance criteria:
- AI sends first message automatically when chat simulation starts
- Initial greeting is contextually appropriate for the scenario
- User can respond normally to the AI's initial message
- Existing chat functionality remains unchanged

### Examples

**Example 1: Café Order Scenario (Beginner)**
- User: Clicks "Ordering at a Café" scenario
- System: Creates session, generates AI greeting
- AI Message: "Bonjour ! Bienvenue au Petit Matin. Qu'est-ce que vous voulez ?"
- User: Sees greeting and can respond

**Example 2: Job Interview Scenario (Advanced)**
- User: Clicks "Job Interview" scenario
- System: Creates session, generates AI greeting
- AI Message: "Bonjour et bienvenue. Pouvez-vous me parler de votre expérience professionnelle ?"
- User: Sees greeting and can respond

**Example 3: User Refreshes Page**
- User: Creates session, gets greeting, then refreshes page
- System: Loads session from database with greeting already in messages
- Result: Greeting appears again (from session history)

### Architecture

**Existing codebase structure:**
- Backend: FastAPI with async SQLAlchemy, routers in `routers/` directory
- Frontend: React 19 with TypeScript, Vite, React Router
- Database: SQLite with SQLAlchemy ORM models
- Session creation: `POST /sessions/` → creates SessionModel with empty messages
- Message sending: `POST /sessions/{id}/messages/` → appends user message, generates AI response, stores both

**Patterns to follow:**
- Backend: Use existing `mistral_client.get_chat_response()` for AI generation
- Backend: Use existing scenario loading via `get_scenario()` with session difficulty
- Frontend: Use existing useSessions hook pattern
- Storage: Append greeting as first message in session.messages_list

### Standards

- **Coding**: PEP 8 (Python), match existing codebase style
- **Testing**: 80% coverage minimum per module (pytest for backend, jest for frontend)
- **Documentation**: Docstrings for new public functions, update README if API changes
- **Code Review**: All PRs require approval
- **Git Workflow**: Follow GIT-WORKFLOW.md (feature branch, PR to main)

### Omissions

Explicitly out of scope:
- Custom greeting configuration by users
- Multiple greeting options per scenario
- AI personality selection
- Changes to feedback endpoint
- Session editing functionality

### Notes

**Implementation hints:**
- See `routers/sessions.py:create_session` for session creation logic
- See `services/mistral.py:get_chat_response` for AI message generation
- See `scenarios.py:get_scenario` for loading scenario with difficulty
- See `frontend/src/hooks/useSessions.tsx:createSession` for frontend session creation
- The system prompt in scenarios already instructs AI to stay in character

**References to similar code:**
- `routers/messages.py:send_message` shows how to generate AI responses
- Pattern: User message + AI response are stored as pairs in session
- For initial greeting: Only AI message (no user message before it)

**Context:**
- All scenarios have difficulty-specific system prompts
- System prompts already tell AI to stay in character and respond only in French
- Initial greeting should naturally emerge from the system prompt context

### Solutions

**Reference implementations to mimic:**
- `send_message` in `routers/messages.py` - for AI response generation pattern
- `createSession` in `frontend/src/hooks/useSessions.tsx` - for session creation pattern
- `ChatInterface.tsx` - for message display pattern

**Pattern to follow:**
1. In `create_session` endpoint, after creating session:
   - Get scenario with session's difficulty
   - Generate initial AI greeting using `mistral_client.get_chat_response()`
   - Start with empty messages list, add AI greeting as first message
   - Store in database and return

2. Frontend `useSessions.tsx` already expects messages in response

3. `ChatInterface.tsx` already displays all messages from session

**Existing code to mimic:**
```python
# From routers/messages.py - pattern for generating AI response
ai_response = mistral_client.get_chat_response(
    messages, scenario["system_prompt"]
)
```

For initial greeting, messages would be empty list `[]`, and the AI should naturally produce a greeting based on the system prompt.

---

*Analysis based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html)*
