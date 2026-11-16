"""Result helpers for the French Language Coach MCP server (issue #268).

Every tool returns a ``CallToolResult`` built here, so success payloads and
errors have one consistent shape. Errors carry a machine-readable ``code``, a
human-readable ``message`` and a ``hint`` naming the next action, so a model can
recover without asking the user. The same dict is sent as JSON text (for
clients that only read text) and as ``structured_content``.
"""

import json
from typing import Any, Optional

from mcp_types import CallToolResult, TextContent

# Error codes. These are part of the tool contract that #270 builds on, so
# don't rename them.
INVALID_ARGUMENTS = "invalid_arguments"
LESSON_NOT_FOUND = "lesson_not_found"
PAGE_OUT_OF_RANGE = "page_out_of_range"
DATABASE_UNAVAILABLE = "database_unavailable"


def _as_result(payload: dict[str, Any], is_error: bool) -> CallToolResult:
    """Wrap a JSON-safe payload as text content plus structured content."""
    text = json.dumps(payload, ensure_ascii=False, default=str)
    return CallToolResult(
        content=[TextContent(type="text", text=text)],
        structured_content=payload,
        is_error=is_error,
    )


def tool_result(payload: dict[str, Any]) -> CallToolResult:
    """Build a successful tool result.

    Args:
        payload: JSON-safe dictionary (use ``model_dump(mode="json")`` for models).

    Returns:
        A CallToolResult with ``is_error=False``.
    """
    return _as_result(payload, is_error=False)


def tool_error(
    code: str,
    message: str,
    hint: str,
    details: Optional[dict[str, Any]] = None,
) -> CallToolResult:
    """Build a structured, recoverable tool error.

    Args:
        code: One of the error code constants in this module.
        message: What went wrong, in one sentence.
        hint: The next action the model should take.
        details: Optional extra data, e.g. suggested ids or the valid page range.

    Returns:
        A CallToolResult with ``is_error=True`` and body
        ``{"error": {"code", "message", "hint", "details"?}}``.
    """
    error: dict[str, Any] = {"code": code, "message": message, "hint": hint}
    if details is not None:
        error["details"] = details
    return _as_result({"error": error}, is_error=True)
