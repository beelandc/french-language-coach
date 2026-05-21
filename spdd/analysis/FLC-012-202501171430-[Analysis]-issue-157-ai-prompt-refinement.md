# SPDD Analysis: Refine AI Contextual Prompts for Conversation Scenarios

**GitHub Issue**: #157
**Issue Title**: Refine AI contextual prompts for conversation scenarios
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/157
**Artifact ID**: FLC-012-202501171430
**Created**: 2025-01-17 14:30
**Author**: Mistral Vibe (AI Assistant)

---

## Original Business Requirement

From GitHub Issue #157:

Currently, the AI's contextual prompts in conversation scenarios have the following issues that need refinement:

- **Response Perspective**: Responses contain dialogue from both the AI character AND the user persona within the same prompt, which breaks role-playing immersion. The AI should only speak from its character's perspective.
- **Dialog Length**: Initial greetings and responses are too verbose, containing multiple questions and topics (greeting, offer of help, request for reservation details, request for ID, service explanations, etc.) that should naturally unfold through back-and-forth exchanges.
- **Natural Flow**: Conversations are pre-scripted as monologues rather than simulating organic dialog where each party speaks in turn.

## Requirements

1. **Single Perspective Only**: Ensure AI responses ONLY contain statements from the AI's character. Never include user dialogue or anticipated user responses in the AI's prompt.

2. **Concise Initial Responses**: Limit greetings and opening responses to 2-3 sentences maximum, introducing only one or two natural topics. Let the conversation develop organically through subsequent exchanges.

3. **Simulate Natural Dialog**: Allow interactions to play out through multiple back-and-forth turns rather than front-loading all possible conversation paths into a single prompt.

## Example of Problem

**Scenario**: Hotel Check-in - Initial Greeting

**Current (BAD)**:
> Bonjour, bienvenue à l'Hôtel Étoile Paris. Comment puis-je vous aider aujourd'hui ? Bonjour, j'ai une réservation au nom de Dubois. Bonjour Monsieur Dubois, bienvenue à l'Hôtel Étoile Paris. Je vais vérifier votre réservation. Pouvez-vous me confirmer votre prénom et me donner une pièce d'identité, s'il vous plaît ? Bien sûr, voici ma carte d'identité. Mon prénom est Thomas. Merci beaucoup, Monsieur Dubois. Je vois effectivement votre réservation pour une chambre deluxe avec vue sur la ville pour trois nuits. Souhaitez-vous que je vous explique les services de l'hôtel pendant que je finalise votre enregistrement ?...

**Problems**:
- Contains statements from both hotel clerk (AI) AND guest (user) in the same prompt
- Attempts to script the entire conversation in one response
- Does not simulate natural turn-taking

**Expected (GOOD)**:
> Bonjour, bienvenue à l'Hôtel Étoile Paris. Comment puis-je vous aider aujourd'hui ?

Then the user responds, and the AI continues the conversation naturally in the next exchange.

## Acceptance Criteria

From GitHub Issue #157:

- [ ] All AI contextual prompts reviewed and updated
- [ ] No user dialogue appears in AI character prompts
- [ ] Initial responses limited to 2-3 sentences
- [ ] Each prompt maintains single character perspective
- [ ] Natural dialog flow is preserved across all conversation scenarios

---

## Background

The French Language Coach application uses AI-powered conversation scenarios to help users practice French. Each scenario (e.g., café ordering, hotel check-in, job interviews) has system prompts that define the AI's role and behavior. These system prompts are currently causing the AI to generate responses that break role-playing immersion by including both AI and user dialogue in a single response, making conversations feel unnatural and scripted.

This issue was identified as a refinement needed after the initial implementation of AI greetings (Issue #155), which added the ability for the AI to generate an initial greeting message when a session starts.

## Business Value

- **Improved User Experience**: More immersive and natural conversations that feel like real interactions
- **Better Learning Outcomes**: Users can practice actual turn-taking and natural dialog flow
- **Higher Engagement**: More realistic conversations keep users engaged longer
- **Consistency**: All scenarios follow the same high-quality standards for AI responses

---

## Scope In

- [ ] Review all system prompts in `scenarios.py`
- [ ] Modify system prompts to explicitly instruct AI to maintain single perspective
- [ ] Add constraints to system prompts limiting response length (2-3 sentences for initial greetings)
- [ ] Ensure prompts encourage natural, turn-based conversation flow
- [ ] Verify all 10 scenarios (cafe_order, ask_directions, job_interview, hotel_checkin, shopping, doctor_visit, train_travel, restaurant_dining, apartment_rental, museum_visit) are updated
- [ ] Verify all 3 difficulty levels (beginner, intermediate, advanced) for each scenario are updated

## Scope Out

- [ ] Modifying the AI model or API (Mistral)
- [ ] Changing the backend logic in `routers/sessions.py` or `routers/messages.py`
- [ ] Modifying frontend components
- [ ] Adding new scenarios
- [ ] Changing the scenario selection or difficulty system
- [ ] Modifying test files (no logic changes, only prompt text changes)

---

## Acceptance Criteria (ACs) in Gherkin Format

1. **AC-1**: All AI contextual prompts reviewed and updated
   **Given** The scenarios.py file
   **When** Reviewing all system prompts
   **Then** All prompts follow the new guidelines

2. **AC-2**: No user dialogue appears in AI character prompts
   **Given** A system prompt for any scenario
   **When** The AI generates a response
   **Then** The response contains ONLY the AI character's dialogue, never user dialogue

3. **AC-3**: Initial responses limited to 2-3 sentences
   **Given** A new conversation session starts
   **When** The AI generates its first greeting
   **Then** The greeting is 2-3 sentences maximum

4. **AC-4**: Each prompt maintains single character perspective
   **Given** Any system prompt
   **When** Analyzed for perspective
   **Then** It defines only the AI's role and constraints, not the user's

5. **AC-5**: Natural dialog flow is preserved
   **Given** A multi-turn conversation
   **When** AI responds to user input
   **Then** Each response is appropriate for that turn and doesn't pre-script future turns

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **Scenario**: Defined in `scenarios.py` - contains id, name, description, and difficulty_levels
- **Difficulty Level**: Each scenario has beginner, intermediate, advanced variants with different system_prompts
- **System Prompt**: The instruction given to the AI to define its role and behavior
- **Session**: Created in `routers/sessions.py` - contains scenario_id, difficulty, messages
- **AI Greeting**: Generated in `create_session()` endpoint using `mistral_client.get_chat_response()`

### New Concepts Required

None - this is a refinement of existing concepts (system prompts).

### Key Business Rules

- System prompts must define ONLY the AI's character and constraints
- System prompts must not contain example dialogues that include user speech
- System prompts should encourage concise, natural responses
- All scenarios must follow consistent prompt structure

---

## Strategic Approach

### Solution Direction

1. **Audit**: Review all existing system prompts in scenarios.py
2. **Refine**: Update each system prompt to:
   - Explicitly state: "Speak ONLY from your character's perspective. Never include user dialogue."
   - Add constraint: "Keep initial greetings to 2-3 sentences maximum."
   - Add constraint: "Let conversations develop naturally through turn-taking."
3. **Test**: Verify prompts by reviewing the changes and ensuring they meet all acceptance criteria
4. **Validate**: Check that the structure is consistent across all scenarios and difficulty levels

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| Add explicit perspective constraint to all prompts | Adds length to prompts, but ensures consistency | Add the constraint to maintain quality |
| Standardize prompt structure across all scenarios | Requires updating all 30+ prompts (10 scenarios × 3 difficulties), but ensures consistency | Standardize for maintainability |
| Keep existing scenario-specific details | Preserves scenario uniqueness, but some prompts are verbose | Keep details but add new constraints |

### Alternatives Considered

- **Alternative 1**: Only update the most problematic scenarios - Rejected because all scenarios should maintain consistent quality
- **Alternative 2**: Create a base prompt template and extend it - Rejected for now as it would be a larger refactor; current approach is more targeted
- **Alternative 3**: Add post-processing to truncate AI responses - Rejected because it's better to fix at the source (the system prompt)

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| What constitutes "user dialogue" in system prompts | Need to confirm if any existing prompts contain user speech | Review all prompts; most appear to only define AI role |
| How to measure "2-3 sentences" | Is this for initial greeting only or all responses? | Apply to initial greetings specifically; general responses can be longer |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| Advanced difficulty prompts are more verbose | Need to ensure they don't encourage overly long responses | Add same constraints to advanced prompts |
| Beginner prompts include example dialogues | Some beginner prompts have "Exemple de vocabulaire" sections | Keep vocabulary examples but ensure they're lists, not dialogue |
| Intermediate prompts are shortest | They already have less detail | Add constraints without making them verbose |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Over-constraining prompts reduces AI naturalness | AI responses might become robotic | Test prompts and adjust if responses seem unnatural |
| Inconsistent application across scenarios | Some scenarios might have better prompts than others | Use a checklist to verify each prompt |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | All prompts reviewed and updated | Yes | Will update all 30+ prompts |
| AC2 | No user dialogue in AI responses | Yes | Will add explicit constraint to all prompts |
| AC3 | Initial responses 2-3 sentences max | Yes | Will add explicit constraint to all prompts |
| AC4 | Single character perspective maintained | Yes | Will add explicit constraint to all prompts |
| AC5 | Natural dialog flow preserved | Yes | Will add constraint to encourage turn-taking |

**AC Coverage Summary**: 5 of 5 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- Maintain backward compatibility (don't break existing functionality)
- Keep scenario-specific details and vocabulary
- Preserve the personality and tone of each scenario

---

## REASONS Canvas

### Requirements
From GitHub issue #157 acceptance criteria:
- All AI contextual prompts reviewed and updated
- No user dialogue appears in AI character prompts
- Initial responses limited to 2-3 sentences
- Each prompt maintains single character perspective
- Natural dialog flow is preserved across all conversation scenarios

### Examples
**Bad Example** (Current - what we're fixing):
```
System Prompt: "Tu es un serveur..."
AI Response: "Bonjour, bienvenue au café. Que voulez-vous ? Un café s'il vous plaît. Voici votre café. Merci. Au revoir."
```
Problem: AI response includes both server and customer dialogue.

**Good Example** (Target):
```
System Prompt: "Tu es un serveur... Réponds UNIQUEMENT en français. Garde tes réponses à 2-3 phrases maximum. Ne jamais inclure le dialogue du client."
AI Response: "Bonjour, bienvenue au café. Que puis-je vous offrir aujourd'hui ?"
```
Result: AI response only contains server's dialogue, is concise.

### Architecture
- **File to modify**: `scenarios.py` - contains SCENARIOS list with all system prompts
- **Function**: `get_scenario()` - retrieves scenario with system prompt
- **Usage**: System prompts are used in `routers/sessions.py` (line 55) and `routers/messages.py` (line 37)
- **Pattern**: Each scenario has 3 difficulty levels, each with a `system_prompt` field

### Standards
- **Coding**: Match existing Python string formatting (triple quotes, French text)
- **Testing**: No new tests needed (only prompt text changes, no logic changes)
- **Documentation**: No README updates needed (internal implementation detail)
- **Code Review**: Changes should be reviewed for consistency and quality

### Omissions
- Modifying backend routing logic
- Adding new scenarios
- Changing difficulty level system
- Modifying frontend
- Adding automated tests for prompt content (manual review is sufficient for this change)

### Notes
- The system prompts are in French as they instruct a French-speaking AI
- Each difficulty level has different constraints (beginner = simpler, advanced = more complex)
- The prompts use French terminology for the roles (serveur, réceptionniste, médecin, etc.)
- Previous work on AI greetings (Issue #155) added the initial greeting generation - this issue refines the prompts that drive those greetings

### Solutions
- **Reference**: Existing pattern in `scenarios.py` - follow the same structure
- **Pattern**: Each system_prompt is a multi-line French string defining the AI's role
- **Template**: Add consistent constraints to all prompts:
  - "Réponds UNIQUEMENT du point de vue de ton personnage. Ne jamais inclure le dialogue de l'utilisateur."
  - "Garde tes réponses initiales à 2-3 phrases maximum."
  - "Laisse la conversation se développer naturellement à travers des échanges."

---

*Analysis based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html)*
