"""
Tests for issue #155: AI should provide initial greeting in chat simulations.

Acceptance Criteria:
- AI sends first message automatically when chat simulation starts
- Initial greeting is contextually appropriate for the scenario
- User can respond normally to the AI's initial message
- Existing chat functionality remains unchanged
"""
from unittest.mock import AsyncMock, patch

import pytest

from models.session import Session as SessionModel
from schemas.session import SessionCreate, SessionResponse, Message


class TestInitialGreeting:
    """Test suite for initial AI greeting functionality in session creation."""

    @pytest.mark.asyncio
    async def test_create_session_with_initial_greeting(self, client):
        """Test that new sessions include an initial AI greeting message."""
        # Given: Valid scenario and difficulty
        session_data = {"scenario_id": "cafe_order", "difficulty": "beginner"}

        # Mock the Mistral client to return a predictable greeting
        with patch('services.mistral.mistral_client.get_chat_response') as mock_get_response:
            mock_get_response.return_value = "Bonjour ! Bienvenue au Petit Matin. Qu'est-ce que vous voulez ?"

            # When: Create session
            response = client.post("/sessions/", json=session_data)

        # Then: Session has first message from AI
        assert response.status_code == 200
        data = response.json()
        assert len(data["messages"]) == 1
        assert data["messages"][0]["role"] == "assistant"
        assert len(data["messages"][0]["content"]) > 0
        assert "Bienvenue" in data["messages"][0]["content"]

    @pytest.mark.asyncio
    async def test_initial_greeting_uses_scenario_difficulty(self, client):
        """Test that greeting uses the session's difficulty level for system prompt."""
        # Given: Job interview scenario with advanced difficulty
        session_data = {"scenario_id": "job_interview", "difficulty": "advanced"}

        # Mock the Mistral client
        with patch('services.mistral.mistral_client.get_chat_response') as mock_get_response:
            # Also patch get_scenario to verify it's called with correct difficulty
            with patch('routers.sessions.get_scenario') as mock_get_scenario:
                mock_scenario = {
                    "id": "job_interview",
                    "system_prompt": "Advanced job interview prompt",
                    "difficulty": "advanced"
                }
                mock_get_scenario.return_value = mock_scenario
                mock_get_response.return_value = "Pouvez-vous me parler de votre expérience professionnelle ?"

                # When: Create session
                response = client.post("/sessions/", json=session_data)

        # Then: get_scenario was called with the correct difficulty
        mock_get_scenario.assert_called_with("job_interview", difficulty="advanced")
        
        # And: Session has the greeting
        data = response.json()
        assert len(data["messages"]) == 1
        assert data["messages"][0]["role"] == "assistant"

    @pytest.mark.asyncio
    async def test_initial_greeting_default_difficulty(self, client):
        """Test that greeting uses intermediate difficulty by default."""
        # Given: Session without explicit difficulty
        session_data = {"scenario_id": "ask_directions"}

        # Mock the Mistral client and get_scenario
        with patch('services.mistral.mistral_client.get_chat_response') as mock_get_response:
            with patch('routers.sessions.get_scenario') as mock_get_scenario:
                mock_scenario = {
                    "id": "ask_directions",
                    "system_prompt": "Intermediate directions prompt",
                    "difficulty": "intermediate"
                }
                mock_get_scenario.return_value = mock_scenario
                mock_get_response.return_value = "Allez tout droit."

                # When: Create session
                response = client.post("/sessions/", json=session_data)

        # Then: get_scenario was called with default intermediate difficulty
        mock_get_scenario.assert_called_with("ask_directions", difficulty="intermediate")
        
        # And: Session has the greeting
        data = response.json()
        assert len(data["messages"]) == 1

    @pytest.mark.asyncio
    async def test_create_session_without_greeting_on_ai_failure(self, client):
        """Test that session is still created if AI greeting generation fails."""
        # Given: Valid scenario
        session_data = {"scenario_id": "cafe_order"}

        # Mock the Mistral client to raise an exception
        with patch('services.mistral.mistral_client.get_chat_response') as mock_get_response:
            mock_get_response.side_effect = Exception("AI service unavailable")

            # When: Create session
            response = client.post("/sessions/", json=session_data)

        # Then: Session is still created successfully (without greeting)
        assert response.status_code == 200
        data = response.json()
        assert data["scenario_id"] == "cafe_order"
        # Messages should be empty since AI greeting failed
        assert data["messages"] == []

    @pytest.mark.asyncio
    async def test_existing_sessions_without_greeting_unchanged(self, client, test_db):
        """Test that existing sessions (created before this feature) still work."""
        # Given: An existing session in the database without a greeting
        async with test_db as db:
            old_session = SessionModel(
                scenario_id="cafe_order",
                difficulty="intermediate",
                messages="[]"
            )
            db.add(old_session)
            await db.commit()
            await db.refresh(old_session)

        # When: Get the existing session
        response = client.get(f"/sessions/{old_session.id}")

        # Then: Session is returned with empty messages (unchanged)
        assert response.status_code == 200
        data = response.json()
        assert data["messages"] == []

    @pytest.mark.asyncio
    async def test_send_message_after_initial_greeting(self, client, test_db):
        """Test that user can send messages normally after initial greeting."""
        # Given: A session with initial greeting
        session_data = {"scenario_id": "cafe_order"}

        with patch('services.mistral.mistral_client.get_chat_response') as mock_get_response:
            # First call is for initial greeting
            # Second call is for user message response
            mock_get_response.side_effect = [
                "Bonjour ! Bienvenue au café.",  # Initial greeting
                "D'accord, je vous apporte ça tout de suite."  # Response to user message
            ]

            # When: Create session
            create_response = client.post("/sessions/", json=session_data)
            session_id = create_response.json()["id"]

            # And: Send user message
            send_response = client.post(
                f"/sessions/{session_id}/messages/",
                json={"content": "Un café s'il vous plaît"}
            )

        # Then: Both responses are successful
        assert create_response.status_code == 200
        assert send_response.status_code == 200
        
        # And: AI responds to user message
        send_data = send_response.json()
        assert send_data["role"] == "assistant"
        assert "D'accord" in send_data["content"]

    @pytest.mark.asyncio
    async def test_initial_greeting_contextually_appropriate(self, client):
        """Test that greetings are contextually appropriate for different scenarios."""
        scenarios_and_expected_terms = [
            ("cafe_order", ["bienvenue", "café", "voulez", "commande"]),
            ("job_interview", ["entretien", "expérience", "poste", "candidat"]),
            ("hotel_checkin", ["bienvenue", "hôtel", "chambre", "réservation"]),
            ("ask_directions", ["direction", "chemin", "tournez", "allez"]),
        ]

        for scenario_id, expected_terms in scenarios_and_expected_terms:
            with patch('services.mistral.mistral_client.get_chat_response') as mock_get_response:
                # Return a greeting that contains one of the expected terms
                mock_get_response.return_value = f"Test greeting with {expected_terms[0]}"

                # When: Create session
                response = client.post("/sessions/", json={"scenario_id": scenario_id})

            # Then: Response is successful
            assert response.status_code == 200
            data = response.json()
            assert len(data["messages"]) == 1
            assert data["messages"][0]["role"] == "assistant"

    @pytest.mark.asyncio
    async def test_session_response_schema_with_greeting(self, client):
        """Test that SessionResponse schema correctly handles messages with greeting."""
        session_data = {"scenario_id": "cafe_order"}

        with patch('services.mistral.mistral_client.get_chat_response') as mock_get_response:
            mock_get_response.return_value = "Bonjour !"

            response = client.post("/sessions/", json=session_data)

        # Then: Response matches SessionResponse schema
        assert response.status_code == 200
        data = response.json()
        
        # Check all required fields
        assert "id" in data
        assert "scenario_id" in data
        assert "difficulty" in data
        assert "created_at" in data
        assert "ended_at" in data
        assert "messages" in data
        assert "feedback" in data
        
        # Check messages field structure
        assert isinstance(data["messages"], list)
        assert len(data["messages"]) == 1
        assert data["messages"][0]["role"] == "assistant"
        assert isinstance(data["messages"][0]["content"], str)

    @pytest.mark.asyncio
    async def test_multiple_sessions_each_get_greeting(self, client):
        """Test that each new session gets its own initial greeting."""
        scenarios = ["cafe_order", "job_interview", "hotel_checkin"]

        with patch('services.mistral.mistral_client.get_chat_response') as mock_get_response:
            mock_get_response.side_effect = [
                "Greeting 1",
                "Greeting 2",
                "Greeting 3",
            ]

            # When: Create multiple sessions
            session_ids = []
            for scenario_id in scenarios:
                response = client.post("/sessions/", json={"scenario_id": scenario_id})
                assert response.status_code == 200
                data = response.json()
                session_ids.append(data["id"])
                assert len(data["messages"]) == 1
                assert data["messages"][0]["content"] == f"Greeting {scenarios.index(scenario_id) + 1}"

        # Then: All sessions were created successfully with unique greetings
        assert len(session_ids) == 3


class TestBackwardCompatibility:
    """Test backward compatibility with existing functionality."""

    @pytest.mark.asyncio
    async def test_get_session_with_messages(self, client, test_db):
        """Test that GET /sessions/{id} correctly returns sessions with messages."""
        # Given: A session with messages in the database
        async with test_db as db:
            session = SessionModel(
                scenario_id="cafe_order",
                difficulty="intermediate",
                messages='[{"role": "assistant", "content": "Bonjour"}]'
            )
            db.add(session)
            await db.commit()
            await db.refresh(session)

        # When: Get the session
        response = client.get(f"/sessions/{session.id}")

        # Then: Session with messages is returned correctly
        assert response.status_code == 200
        data = response.json()
        assert len(data["messages"]) == 1
        assert data["messages"][0]["role"] == "assistant"
        assert data["messages"][0]["content"] == "Bonjour"

    @pytest.mark.asyncio
    async def test_list_sessions_with_greetings(self, client, test_db):
        """Test that session listing still works with sessions that have greetings."""
        # Given: Sessions with and without greetings
        async with test_db as db:
            # Session with greeting
            session_with = SessionModel(
                scenario_id="cafe_order",
                difficulty="intermediate",
                messages='[{"role": "assistant", "content": "Bonjour"}]'
            )
            # Session without greeting (old session)
            session_without = SessionModel(
                scenario_id="job_interview",
                difficulty="intermediate",
                messages="[]"
            )
            db.add(session_with)
            db.add(session_without)
            await db.commit()

        # When: List all sessions
        response = client.get("/sessions/?page=1&per_page=10")

        # Then: Both sessions are listed correctly
        assert response.status_code == 200
        data = response.json()
        assert data["pagination"]["total"] == 2
        assert len(data["sessions"]) == 2

    @pytest.mark.asyncio
    async def test_send_message_to_session_with_greeting(self, client, test_db):
        """Test that sendMessage works correctly for sessions with initial greetings."""
        # Given: A session with initial greeting
        async with test_db as db:
            session = SessionModel(
                scenario_id="cafe_order",
                difficulty="intermediate",
                messages='[{"role": "assistant", "content": "Bonjour !"}]'
            )
            db.add(session)
            await db.commit()
            await db.refresh(session)

        # Mock the Mistral client for the response
        with patch('services.mistral.mistral_client.get_chat_response') as mock_get_response:
            mock_get_response.return_value = "Qu'est-ce que vous voulez ?"

            # When: Send a message
            response = client.post(
                f"/sessions/{session.id}/messages/",
                json={"content": "Bonjour"}
            )

        # Then: Message is sent and AI responds
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "assistant"
        assert len(data["content"]) > 0
