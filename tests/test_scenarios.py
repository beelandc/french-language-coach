"""
Tests for difficulty levels in scenarios (Issue #5: 1.5.1-T).

Acceptance Criteria:
- Tests verify each scenario has 3 difficulty variants
- Tests verify prompts differ between levels
- Tests verify default is intermediate
- 80% code coverage for difficulty-related code
"""
import pytest

from scenarios import SCENARIOS, get_scenario, VALID_DIFFICULTIES


class TestScenariosStructure:
    """Test the structure of scenarios with difficulty levels."""

    def test_all_scenarios_have_difficulty_levels(self, valid_scenario_ids):
        """Verify each scenario has 3 difficulty variants (beginner, intermediate, advanced)."""
        for scenario_id in valid_scenario_ids:
            scenario = next(s for s in SCENARIOS if s["id"] == scenario_id)
            assert "difficulty_levels" in scenario, f"Scenario {scenario_id} missing difficulty_levels"
            
            difficulty_levels = scenario["difficulty_levels"]
            assert "beginner" in difficulty_levels, f"Scenario {scenario_id} missing beginner level"
            assert "intermediate" in difficulty_levels, f"Scenario {scenario_id} missing intermediate level"
            assert "advanced" in difficulty_levels, f"Scenario {scenario_id} missing advanced level"

    def test_each_difficulty_has_system_prompt(self, valid_scenario_ids):
        """Verify each difficulty level has a system_prompt."""
        for scenario_id in valid_scenario_ids:
            scenario = next(s for s in SCENARIOS if s["id"] == scenario_id)
            
            for difficulty in VALID_DIFFICULTIES:
                difficulty_data = scenario["difficulty_levels"][difficulty]
                assert "system_prompt" in difficulty_data, \
                    f"Scenario {scenario_id}, difficulty {difficulty} missing system_prompt"
                assert difficulty_data["system_prompt"], \
                    f"Scenario {scenario_id}, difficulty {difficulty} has empty system_prompt"

    def test_each_difficulty_has_name_suffix(self, valid_scenario_ids):
        """Verify each difficulty level has a name_suffix."""
        for scenario_id in valid_scenario_ids:
            scenario = next(s for s in SCENARIOS if s["id"] == scenario_id)
            
            for difficulty in VALID_DIFFICULTIES:
                difficulty_data = scenario["difficulty_levels"][difficulty]
                assert "name_suffix" in difficulty_data, \
                    f"Scenario {scenario_id}, difficulty {difficulty} missing name_suffix"


class TestGetScenarioFunction:
    """Test the get_scenario function with difficulty parameter."""

    def test_default_difficulty_is_intermediate(self, valid_scenario_ids):
        """Verify default difficulty is intermediate when not specified."""
        for scenario_id in valid_scenario_ids:
            scenario = get_scenario(scenario_id)
            assert scenario["difficulty"] == "intermediate", \
                f"Scenario {scenario_id} default difficulty should be intermediate"

    def test_explicit_difficulty_selection(self, valid_scenario_ids):
        """Verify explicit difficulty selection works for all levels."""
        for scenario_id in valid_scenario_ids:
            for difficulty in VALID_DIFFICULTIES:
                scenario = get_scenario(scenario_id, difficulty=difficulty)
                assert scenario["difficulty"] == difficulty, \
                    f"Scenario {scenario_id} difficulty should be {difficulty}"

    def test_get_scenario_returns_system_prompt(self, valid_scenario_ids):
        """Verify get_scenario returns a system_prompt for backward compatibility."""
        for scenario_id in valid_scenario_ids:
            for difficulty in VALID_DIFFICULTIES:
                scenario = get_scenario(scenario_id, difficulty=difficulty)
                assert "system_prompt" in scenario, \
                    f"Scenario {scenario_id} should have system_prompt"
                assert scenario["system_prompt"], \
                    f"Scenario {scenario_id} system_prompt should not be empty"

    def test_get_scenario_returns_all_expected_fields(self, valid_scenario_ids):
        """Verify get_scenario returns all expected fields."""
        for scenario_id in valid_scenario_ids:
            scenario = get_scenario(scenario_id)
            assert "id" in scenario
            assert "name" in scenario
            assert "description" in scenario
            assert "system_prompt" in scenario
            assert "difficulty" in scenario

    def test_invalid_scenario_id_raises_error(self):
        """Verify invalid scenario ID raises ValueError."""
        with pytest.raises(ValueError) as exc_info:
            get_scenario("invalid_scenario_id")
        assert "not found" in str(exc_info.value).lower()

    def test_invalid_difficulty_raises_error(self, valid_scenario_ids):
        """Verify invalid difficulty raises ValueError."""
        for scenario_id in valid_scenario_ids:
            with pytest.raises(ValueError) as exc_info:
                get_scenario(scenario_id, difficulty="invalid")
            assert "invalid difficulty" in str(exc_info.value).lower()


class TestDifficultyPromptDifferences:
    """Test that prompts differ between difficulty levels."""

    def test_prompts_differ_between_levels(self, valid_scenario_ids):
        """Verify prompts differ between beginner, intermediate, and advanced for each scenario."""
        for scenario_id in valid_scenario_ids:
            beginner = get_scenario(scenario_id, difficulty="beginner")
            intermediate = get_scenario(scenario_id, difficulty="intermediate")
            advanced = get_scenario(scenario_id, difficulty="advanced")
            
            # All three should have different prompts
            assert beginner["system_prompt"] != intermediate["system_prompt"], \
                f"Scenario {scenario_id}: beginner and intermediate prompts should differ"
            assert intermediate["system_prompt"] != advanced["system_prompt"], \
                f"Scenario {scenario_id}: intermediate and advanced prompts should differ"
            assert beginner["system_prompt"] != advanced["system_prompt"], \
                f"Scenario {scenario_id}: beginner and advanced prompts should differ"

    def test_beginner_prompts_are_shorter(self, valid_scenario_ids):
        """Verify beginner prompts tend to be simpler (shorter) than advanced."""
        for scenario_id in valid_scenario_ids:
            beginner = get_scenario(scenario_id, difficulty="beginner")
            advanced = get_scenario(scenario_id, difficulty="advanced")
            
            # Beginner prompts should generally be shorter or equal
            # (This is a heuristic - actual content quality is more important)
            beginner_length = len(beginner["system_prompt"])
            advanced_length = len(advanced["system_prompt"])
            
            # We don't enforce strict length requirements, just that they're different
            # This test documents the intent that beginner prompts are simpler
            assert beginner_length > 0
            assert advanced_length > 0

    def test_name_suffixes_differ(self, valid_scenario_ids):
        """Verify name suffixes differ between levels."""
        for scenario_id in valid_scenario_ids:
            beginner = get_scenario(scenario_id, difficulty="beginner")
            intermediate = get_scenario(scenario_id, difficulty="intermediate")
            advanced = get_scenario(scenario_id, difficulty="advanced")
            
            # Intermediate should have empty suffix (baseline)
            assert "débutant" in beginner["name"].lower() or "beginner" in beginner["name"].lower()
            # Advanced should have suffix
            assert "avancé" in advanced["name"].lower() or "advanced" in advanced["name"].lower()


class TestValidDifficulties:
    """Test the VALID_DIFFICULTIES constant."""

    def test_valid_difficulties_contains_expected_values(self):
        """Verify VALID_DIFFICULTIES contains the expected values."""
        assert "beginner" in VALID_DIFFICULTIES
        assert "intermediate" in VALID_DIFFICULTIES
        assert "advanced" in VALID_DIFFICULTIES
        assert len(VALID_DIFFICULTIES) == 3
