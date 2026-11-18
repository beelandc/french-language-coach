"""Tests for the study-coach agent (issue #270).

The agent runs on the SDK's real tool runner and the real #268 MCP server (in-process,
on the test database). Only the Claude API is scripted, through ``ScriptedClaude``, so
these tests see exactly what the runner sends back to the model. No network calls.
"""

import json

import pytest

from config import Settings
from mcp_server import create_server
from schemas.study_plan import StudyPlanDraft
from services.llm.anthropic_provider import AnthropicProvider
from services.llm.base import AgentRunError, LLMProviderError
from services.llm.study_coach import (
    INVALID_PLAN,
    STUDY_COACH_MCP_TOOLS,
    STUDY_COACH_SYSTEM_PROMPT,
    SUBMIT_TOOL_NAME,
    TAXONOMY_HEADING,
    StudyPlanCapture,
    build_study_coach_system_prompt,
    build_study_coach_user_message,
    extract_taxonomy,
    run_study_coach,
    validate_plan,
)
from tests.conftest import AsyncTestingSession
from tests.llm_fakes import (
    STUDY_FEEDBACK,
    STUDY_MESSAGES,
    ScriptedClaude,
    error_turn,
    refusal_turn,
    study_plan_input,
    text_turn,
    tool_use_turn,
)

MODEL = "claude-sonnet-5-5"


def settings(**overrides) -> Settings:
    values = {"ANTHROPIC_API_KEY": "a", "MISTRAL_API_KEY": "m"}
    values.update(overrides)
    return Settings(_env_file=None, **values)


def server_factory():
    return create_server(session_factory=AsyncTestingSession)


async def run(script: ScriptedClaude, max_iterations: int = 8, **overrides):
    provider = AnthropicProvider(api_key="test", client=script.client())
    return await run_study_coach(
        provider,
        model=MODEL,
        max_iterations=max_iterations,
        settings=overrides.pop("settings", settings()),
        messages=STUDY_MESSAGES,
        feedback=STUDY_FEEDBACK,
        difficulty="intermediate",
        server_factory=overrides.pop("server_factory", server_factory),
    )


class TestRecovery:
    @pytest.mark.asyncio
    async def test_agent_recovers_from_lesson_not_found(self, test_db):
        """AC1: a structured tool error reaches the model as an error, and it recovers."""
        # Given a model that guesses a wrong lesson id, then uses the suggestion
        script = ScriptedClaude([
            tool_use_turn("get_lesson", {"lesson_id": "subjonctif"}, usage=(800, 60)),
            tool_use_turn("get_lesson", {"lesson_id": "subjunctive"}, usage=(1200, 60)),
            tool_use_turn(SUBMIT_TOOL_NAME, study_plan_input("subjunctive"), usage=(1600, 300)),
            text_turn("Plan envoyé.", usage=(1700, 20)),
        ])

        # When
        outcome = await run(script)

        # Then the first tool result is a structured lesson_not_found error
        [error_block] = script.tool_results(1)
        assert error_block["is_error"] is True
        error = ScriptedClaude.result_json(error_block)["error"]
        assert error["code"] == "lesson_not_found"
        assert "subjunctive" in error["details"]["did_you_mean"]
        # and the agent's next call used the suggested id successfully
        assert script.requests[2]["messages"][-2]["content"][0]["input"] == {"lesson_id": "subjunctive"}
        [lesson_block] = script.tool_results(2)
        assert not lesson_block.get("is_error")
        assert ScriptedClaude.result_json(lesson_block)["lesson"]["id"] == "subjunctive"
        # and the run produced the plan
        assert outcome.plan.items[0].lesson_id == "subjunctive"
        assert outcome.model == MODEL
        assert outcome.result.iterations == 4
        assert (outcome.result.input_tokens, outcome.result.output_tokens) == (5300, 440)
        assert outcome.result.stop_reason == "end_turn"
        assert outcome.result.text == "Plan envoyé."

    @pytest.mark.asyncio
    async def test_invalid_plan_is_returned_as_error_then_fixed(self, test_db):
        script = ScriptedClaude([
            tool_use_turn(SUBMIT_TOOL_NAME, study_plan_input("passe-compose-2")),
            tool_use_turn(SUBMIT_TOOL_NAME, study_plan_input("passe-compose")),
            text_turn("OK."),
        ])

        outcome = await run(script)

        [block] = script.tool_results(1)
        assert block["is_error"] is True
        error = ScriptedClaude.result_json(block)["error"]
        assert error["code"] == INVALID_PLAN
        assert error["details"]["problems"] == [
            {
                "field": "items.0.lesson_id",
                "problem": "No lesson with id 'passe-compose-2'.",
                "did_you_mean": ["passe-compose"],
            }
        ]
        [accepted] = script.tool_results(2)
        assert not accepted.get("is_error")
        assert ScriptedClaude.result_json(accepted)["status"] == "accepted"
        assert outcome.plan.items[0].lesson_id == "passe-compose"


class TestToolsAndRequests:
    @pytest.mark.asyncio
    async def test_exactly_five_tools_and_request_settings(self, test_db):
        script = ScriptedClaude([
            tool_use_turn(SUBMIT_TOOL_NAME, study_plan_input()),
            text_turn("OK."),
        ])

        await run(script)

        first = script.requests[0]
        names = [tool["name"] for tool in first["tools"]]
        assert names == [*STUDY_COACH_MCP_TOOLS, SUBMIT_TOOL_NAME]
        assert len(names) == 5
        assert "get_due_cards" not in names
        assert first["model"] == MODEL
        assert first["output_config"] == {"effort": "medium"}
        assert "thread" not in first
        assert "tool_choice" not in first
        assert "thinking" not in first
        assert first["system"].startswith(STUDY_COACH_SYSTEM_PROMPT)
        assert TAXONOMY_HEADING in first["system"]
        [user_turn] = first["messages"]
        assert "<level>intermediate</level>" in user_turn["content"]
        assert "il faut que tu viens" in user_turn["content"]
        # the full history is resent on later calls
        assert len(script.requests[1]["messages"]) == 3

    @pytest.mark.asyncio
    async def test_missing_mcp_tool_raises(self, test_db):
        server = server_factory()
        server.remove_tool("list_exercises")

        with pytest.raises(RuntimeError, match="list_exercises"):
            await run(ScriptedClaude([]), server_factory=lambda: server)


class TestRunFailures:
    @pytest.mark.asyncio
    async def test_iteration_cap(self, test_db):
        """AC2: the run stops at max_iterations and fails with summed usage."""
        script = ScriptedClaude([
            tool_use_turn("list_exercises", {}, usage=(1000, 50)) for _ in range(5)
        ])

        with pytest.raises(AgentRunError) as excinfo:
            await run(script, max_iterations=3)

        assert len(script.requests) == 3
        assert excinfo.value.code == "iteration_cap"
        assert str(excinfo.value).startswith("iteration_cap: no valid plan after 3 model calls")
        assert excinfo.value.result.iterations == 3
        assert excinfo.value.result.input_tokens == 3000

    @pytest.mark.asyncio
    async def test_valid_plan_wins_even_if_cap_is_hit_after(self, test_db):
        script = ScriptedClaude([
            tool_use_turn(SUBMIT_TOOL_NAME, study_plan_input()),
            tool_use_turn("list_exercises", {}),
        ])

        outcome = await run(script, max_iterations=2)

        assert outcome.result.stop_reason == "tool_use"
        assert outcome.plan.items[0].lesson_id == "subjunctive"

    @pytest.mark.asyncio
    async def test_no_plan_submitted(self, test_db):
        script = ScriptedClaude([text_turn("Voici mes conseils.", usage=(900, 100))])

        with pytest.raises(AgentRunError) as excinfo:
            await run(script)

        assert excinfo.value.code == "no_plan_submitted"
        assert excinfo.value.result.output_tokens == 100

    @pytest.mark.asyncio
    async def test_refusal_keeps_usage(self, test_db):
        script = ScriptedClaude([
            tool_use_turn("list_exercises", {}, usage=(1000, 50)),
            refusal_turn("cyber", usage=(1200, 0)),
        ])

        with pytest.raises(LLMProviderError, match="refusal: cyber") as excinfo:
            await run(script)

        assert not isinstance(excinfo.value, AgentRunError)
        assert excinfo.value.result.input_tokens == 2200
        assert excinfo.value.result.iterations == 2

    @pytest.mark.asyncio
    async def test_api_error_mid_run_keeps_usage(self, test_db):
        script = ScriptedClaude([
            tool_use_turn("list_exercises", {}, usage=(1000, 50)),
            error_turn(500),
        ])

        with pytest.raises(LLMProviderError, match="api_error: InternalServerError") as excinfo:
            await run(script)

        assert excinfo.value.result.input_tokens == 1000
        assert excinfo.value.result.iterations == 1


class TestValidatePlan:
    def test_valid_plan(self):
        plan, problems = validate_plan(study_plan_input())
        assert problems == []
        assert isinstance(plan, StudyPlanDraft)
        assert plan.cards[0].front == "un croissant"

    def test_unknown_exercise_and_duplicate_lesson(self):
        args = study_plan_input()
        args["items"] = [
            {**args["items"][0], "exercise_ids": ["conjugation-parler-nous", "conjugation-parlr-nous"]},
            {**args["items"][0]},
        ]
        plan, problems = validate_plan(args)
        assert plan is None
        assert problems == [
            {
                "field": "items.0.exercise_ids.1",
                "problem": "No exercise with id 'conjugation-parlr-nous'.",
                "did_you_mean": ["conjugation-parler-nous"],
            },
            {
                "field": "items.1.lesson_id",
                "problem": "Lesson 'subjunctive' is already used by another item.",
            },
        ]

    def test_shape_and_limit_problems(self):
        args = study_plan_input(items=[], cards=[{"front": "x" * 501, "back": "y"}] * 6)
        args["extra"] = 1
        plan, problems = validate_plan(args)
        assert plan is None
        fields = {p["field"] for p in problems}
        assert {"items", "cards", "extra"} <= fields

    @pytest.mark.asyncio
    async def test_capture_counts_submissions(self):
        capture = StudyPlanCapture()
        with pytest.raises(Exception):
            await capture._submit(**study_plan_input("nope"))
        assert capture.plan is None
        reply = json.loads(await capture._submit(**study_plan_input()))
        assert reply["status"] == "accepted"
        assert capture.submissions == 2
        assert capture.plan is not None


class TestPrompts:
    def test_taxonomy_extracted_from_rubric(self):
        text = "# R\n\n## Scope\nx\n\n## Error taxonomy\n\n| a |\n\n## What not to correct\ny"
        assert extract_taxonomy(text) == "## Error taxonomy\n\n| a |"
        assert extract_taxonomy("## Error taxonomy\nlast") == "## Error taxonomy\nlast"
        assert extract_taxonomy("no taxonomy here") is None

    def test_system_prompt_includes_real_taxonomy(self):
        prompt = build_study_coach_system_prompt(settings())
        assert "`tense_mood`" in prompt
        assert "## Scores" not in prompt

    def test_system_prompt_without_rubric_file(self, caplog):
        prompt = build_study_coach_system_prompt(settings(FEEDBACK_RUBRIC_FILE="data/missing.md"))
        assert prompt == STUDY_COACH_SYSTEM_PROMPT
        assert "without the error taxonomy" in caplog.text

    def test_user_message(self):
        message = build_study_coach_user_message(STUDY_MESSAGES, STUDY_FEEDBACK, "beginner")
        assert message.startswith("<level>beginner</level>\n<transcript>\nassistant: Bonjour")
        assert '"focus_area": "le subjonctif"' in message
        assert message.endswith("</feedback>\nBuild the study plan.")
