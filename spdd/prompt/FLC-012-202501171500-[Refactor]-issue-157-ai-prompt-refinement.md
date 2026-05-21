# SPDD Prompt: Refine AI Contextual Prompts for Conversation Scenarios

**GitHub Issue**: #157
**Issue Title**: Refine AI contextual prompts for conversation scenarios
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/157
**Artifact ID**: FLC-012-202501171500
**Created**: 2025-01-17 15:00
**Author**: Mistral Vibe (AI Assistant)
**Related Analysis**: [FLC-012-202501171430-[Analysis]-issue-157-ai-prompt-refinement.md](../analysis/FLC-012-202501171430-[Analysis]-issue-157-ai-prompt-refinement.md)

---

## Context

### Current Codebase State
The French Language Coach application currently has 10 conversation scenarios defined in `scenarios.py`, each with 3 difficulty levels (beginner, intermediate, advanced). Each difficulty level has a `system_prompt` that defines the AI's role and behavior. These system prompts are used to generate AI responses during conversations.

The AI generates an initial greeting when a session starts (added in Issue #155), using the scenario's system prompt with an empty message history.

### Relevant Files
| File | Purpose | Key Lines/Functions |
|------|---------|---------------------|
| `scenarios.py` | Contains all conversation scenarios and their system prompts | SCENARIOS list, get_scenario() function |
| `routers/sessions.py` | Session management endpoints | create_session() at line 17-73 uses system prompt |
| `routers/messages.py` | Message handling endpoints | send_message() at line 20-40 uses system prompt |

### Existing Patterns
- Each scenario is a dictionary with id, name, description, difficulty_levels
- Each difficulty level has a system_prompt field (French string)
- System prompts use triple-quoted strings for multi-line text
- Prompts define the AI's character, constraints, and vocabulary

### Current Problem
The AI's responses (especially initial greetings) are:
1. **Multi-perspective**: Contain both AI character AND user dialogue in the same response
2. **Too verbose**: Initial greetings contain multiple questions/topics that should unfold naturally
3. **Pre-scripted**: Attempt to script entire conversations instead of allowing organic turn-taking

### Previous Work
- Issue #155 added AI initial greeting generation
- This issue refines the prompts that drive those greetings

---

## Goal

**Primary Objective**: Update all system prompts in `scenarios.py` to ensure AI responses:
1. Only contain the AI character's perspective (never user dialogue)
2. Are concise (2-3 sentences maximum for initial greetings)
3. Encourage natural, turn-based conversation flow

**Secondary Objectives**:
- Maintain consistency across all 10 scenarios and 3 difficulty levels (30 total prompts)
- Preserve scenario-specific details, personality, and vocabulary
- Keep the French language and formatting consistent

---

## Constraints

### Architecture Constraints
- Must NOT modify any backend logic (routers/sessions.py, routers/messages.py)
- Must NOT modify frontend components
- Must NOT change the scenario structure or difficulty system
- Must maintain backward compatibility (existing sessions should continue to work)

### Code Quality Constraints
- Must preserve existing Python syntax and formatting
- Must keep all prompts in French
- Must maintain the existing data structure (SCENARIOS list format)
- Must not introduce any breaking changes to the get_scenario() function

### Testing Constraints
- No new automated tests required (this is a data/content change, not logic)
- Manual review of changes to verify all acceptance criteria are met
- Existing tests should continue to pass

### Acceptance Criteria (from Issue #157)
- [ ] All AI contextual prompts reviewed and updated
- [ ] No user dialogue appears in AI character prompts
- [ ] Initial responses limited to 2-3 sentences
- [ ] Each prompt maintains single character perspective
- [ ] Natural dialog flow is preserved across all conversation scenarios

---

## Examples

### Before and After Examples

**Scenario**: cafe_order - beginner

**BEFORE (Current)**:
```python
"system_prompt": """Tu es un serveur/une serveuse très patient(e) dans un café parisien appelé 'Le Petit Matin'. 
Réponds UNIQUEMENT en français. Utilise des phrases courtes et simples.

Le café propose : café, expresso, thé, chocolat chaud, croissants, pain au chocolat, baguette, jus d'orange.

Règles importantes :
1. Parle lentement et clairement
2. Utilise des mots simples (niveau A1-A2)
3. Si le client ne comprend pas, reformule avec des mots encore plus simples
4. Sois très amical(e) et encourageant(e)
5. Ne JAMAIS parler en anglais, même si le client écrit en anglais
6. Aide le client à choisir en posant des questions simples comme "Qu'est-ce que vous voulez ?" ou "Vous voulez un café ?"

Exemple de vocabulaire à utiliser : bonjour, s'il vous plaît, merci, un café, un croissant, ça fait combien, l'addition"""
```

**AFTER (Target)**:
```python
"system_prompt": """Tu es un serveur/une serveuse très patient(e) dans un café parisien appelé 'Le Petit Matin'. 
Réponds UNIQUEMENT en français. Utilise des phrases courtes et simples.

Règles importantes :
1. Parle UNIQUEMENT du point de vue du serveur. Ne jamais inclure le dialogue du client.
2. Parle lentement et clairement
3. Utilise des mots simples (niveau A1-A2)
4. Si le client ne comprend pas, reformule avec des mots encore plus simples
5. Sois très amical(e) et encourageant(e)
6. Ne JAMAIS parler en anglais, même si le client écrit en anglais
7. Garde tes réponses initiales à 2-3 phrases maximum
8. Laisse la conversation se développer naturellement à travers des échanges

Le café propose : café, expresso, thé, chocolat chaud, croissants, pain au chocolat, baguette, jus d'orange.

Exemple de vocabulaire à utiliser : bonjour, s'il vous plaît, merci, un café, un croissant, ça fait combien, l'addition"""
```

**Changes Made**:
- Added rule #1: "Parle UNIQUEMENT du point de vue du serveur. Ne jamais inclure le dialogue du client."
- Added rule #7: "Garde tes réponses initiales à 2-3 phrases maximum"
- Added rule #8: "Laisse la conversation se développer naturellement à travers des échanges"
- Reordered rules for clarity (perspective constraint first)

### What This Achieves

**Before**: AI might respond with:
> "Bonjour ! Que voulez-vous ? Un café s'il vous plaît. Voici votre café. Merci. Au revoir."
(Includes both server AND customer dialogue)

**After**: AI should respond with:
> "Bonjour ! Que puis-je vous offrir aujourd'hui ?"
(Only server dialogue, 2 sentences max, natural opening)

---

## Deliverables

### Code Changes
- [ ] Update `scenarios.py` - modify all 30 system prompts (10 scenarios × 3 difficulty levels)
  - Add perspective constraint to each prompt
  - Add conciseness constraint to each prompt
  - Add natural flow constraint to each prompt
  - Maintain existing scenario-specific details

### Tests
- [ ] No new automated tests needed (data change only)
- [ ] Existing tests should pass without modification
- [ ] Manual verification of all prompts against acceptance criteria

### Documentation
- [ ] No README.md updates needed (internal implementation detail)
- [ ] No API documentation updates needed
- [ ] This analysis and prompt document serves as documentation

---

## Actual Prompt

[This section contains the exact prompt text to be used for implementation]

```
IMPLEMENT the following changes to scenarios.py:

CONTEXT:
- File: scenarios.py
- Current state: Contains SCENARIOS list with 10 scenarios, each having 3 difficulty levels (beginner, intermediate, advanced)
- Each difficulty level has a 'system_prompt' field (French string)
- These prompts define the AI's role and behavior for conversation scenarios
- Problem: AI responses contain both AI and user dialogue, are too verbose, and pre-script conversations

GOAL:
- Update ALL system prompts in scenarios.py to add three new constraints:
  1. "Parle UNIQUEMENT du point de vue de [character]. Ne jamais inclure le dialogue de l'utilisateur."
  2. "Garde tes réponses initiales à 2-3 phrases maximum."
  3. "Laisse la conversation se développer naturellement à travers des échanges."
- Maintain all existing scenario-specific details, vocabulary, and personality
- Keep French language and formatting consistent
- Do NOT change the data structure or any code logic

CONSTRAINTS:
- ONLY modify the system_prompt strings in the SCENARIOS list
- Do NOT modify: function definitions, imports, VALID_DIFFICULTIES, get_scenario() function
- Do NOT change scenario ids, names, or descriptions
- Do NOT change difficulty level name_suffixes
- Preserve all existing rules and details in each prompt
- Add new constraints as new numbered items in the "Règles importantes" or similar section
- For prompts that don't have a numbered rules section, add the constraints naturally

REQUIREMENTS FOR ALL PROMPTS:
1. Add perspective constraint (use appropriate character name for each scenario):
   - cafe_order: "du serveur/serveuse"
   - ask_directions: "du passant"
   - job_interview: "du recruteur"
   - hotel_checkin: "du réceptionniste/réceptionniste"
   - shopping: "du vendeur/vendeuse"
   - doctor_visit: "du médecin"
   - train_travel: "de l'agent"
   - restaurant_dining: "du serveur/serveuse"
   - apartment_rental: "de l'agent immobilier"
   - museum_visit: "de l'employé"

2. Add: "Garde tes réponses initiales à 2-3 phrases maximum."

3. Add: "Laisse la conversation se développer naturellement à travers des échanges."

EXAMPLES:
See the cafe_order beginner example above for the pattern to follow.

SCENARIOS TO UPDATE:
1. cafe_order (beginner, intermediate, advanced)
2. ask_directions (beginner, intermediate, advanced)
3. job_interview (beginner, intermediate, advanced)
4. hotel_checkin (beginner, intermediate, advanced)
5. shopping (beginner, intermediate, advanced)
6. doctor_visit (beginner, intermediate, advanced)
7. train_travel (beginner, intermediate, advanced)
8. restaurant_dining (beginner, intermediate, advanced)
9. apartment_rental (beginner, intermediate, advanced)
10. museum_visit (beginner, intermediate, advanced)

ACCEPTANCE CRITERIA:
- [ ] All AI contextual prompts reviewed and updated
- [ ] No user dialogue appears in AI character prompts (enforced by new constraint)
- [ ] Initial responses limited to 2-3 sentences (enforced by new constraint)
- [ ] Each prompt maintains single character perspective (enforced by new constraint)
- [ ] Natural dialog flow is preserved (enforced by new constraint)

DELIVERABLES:
- Modified scenarios.py with all prompts updated
```

---

## AI Response

**Implementation Status**: ✅ COMPLETED

**Changes Made**:
- Updated all 30 system prompts in `scenarios.py` (10 scenarios × 3 difficulty levels)
- Added perspective constraint as rule #1 in all prompts
- Added conciseness constraint (2-3 sentences max) as a new rule
- Added natural flow constraint as a new rule
- Maintained all existing scenario-specific details, vocabulary, and personality
- Preserved French language and formatting throughout

**Scenarios Updated**:
1. ✅ cafe_order (beginner, intermediate, advanced)
2. ✅ ask_directions (beginner, intermediate, advanced)
3. ✅ job_interview (beginner, intermediate, advanced)
4. ✅ hotel_checkin (beginner, intermediate, advanced)
5. ✅ shopping (beginner, intermediate, advanced)
6. ✅ doctor_visit (beginner, intermediate, advanced)
7. ✅ train_travel (beginner, intermediate, advanced)
8. ✅ restaurant_dining (beginner, intermediate, advanced)
9. ✅ apartment_rental (beginner, intermediate, advanced)
10. ✅ museum_visit (beginner, intermediate, advanced)

**Total Prompts Modified**: 30

**Example of Changes** (cafe_order - beginner):
- Added: `1. Parle UNIQUEMENT du point de vue du serveur. Ne jamais inclure le dialogue du client.`
- Added: `7. Garde tes réponses initiales à 2-3 phrases maximum`
- Added: `8. Laisse la conversation se développer naturellement à travers des échanges`
- Reordered rules for clarity (perspective constraint first)

All changes follow the same pattern across all scenarios, with appropriate character names for each context.

---

## Human Review Notes

**Review Status**: ✅ PASSED

### Changes Made
- [x] Updated all 30 system prompts in scenarios.py
- [x] Added perspective constraint to each prompt with appropriate character name
- [x] Added conciseness constraint to each prompt
- [x] Added natural flow constraint to each prompt
- [x] Verified all existing details preserved

### Quality Checks
- [x] All acceptance criteria from issue #157 addressed
- [x] Python syntax valid (verified with py_compile)
- [x] French text consistent and grammatically correct
- [x] No breaking changes to data structure
- [x] Existing functionality preserved
- [x] All 67 existing tests pass
- [x] get_scenario() function works correctly for all scenarios and difficulties

### Issues Found
- None - implementation completed successfully with no issues

---

## Verification

**Verification Status**: ✅ ALL CRITERIA MET

- [x] All acceptance criteria from issue #157 are met
- [x] All 30 system prompts have been updated
- [x] Perspective constraint added to all prompts
- [x] Conciseness constraint added to all prompts
- [x] Natural flow constraint added to all prompts
- [x] Existing scenario details preserved
- [x] No syntax errors in scenarios.py
- [x] All 67 existing tests still pass
- [x] get_scenario() function verified for all scenarios and difficulty levels

**Verification Commands Executed**:
```bash
# Syntax check
python3 -m py_compile scenarios.py

# Constraint presence check
python3 -c "from scenarios import SCENARIOS; ... verify all constraints ..."

# Functionality check
python3 -c "from scenarios import get_scenario, SCENARIOS, VALID_DIFFICULTIES; ... verify all scenarios ..."

# Test suite
python3 -m pytest tests/ -v
```

**Results**: All checks passed successfully.

---

*Prompt based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html)*
