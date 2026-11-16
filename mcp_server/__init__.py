"""Read-only MCP server over the French Language Coach's content (issue #268).

Exposes grammar reference search, grammar lessons, exercises, focus-area lesson
recommendations and due vocabulary cards as MCP tools over stdio, for Claude
Code or Claude Desktop. Run it with ``python3 -m mcp_server`` from the repo root,
or ``python3 /absolute/path/to/mcp_server/__main__.py`` from anywhere.
"""

from mcp_server.server import create_server

__all__ = ["create_server"]
