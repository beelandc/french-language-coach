"""Stdio entry point for the French Language Coach MCP server (issue #268).

Works both as ``python3 -m mcp_server`` and as
``python3 /absolute/path/to/mcp_server/__main__.py``. MCP clients may launch the
server from any working directory, so ``bootstrap()`` first puts the repo root
on ``sys.path`` and makes it the working directory. That way the project
modules import, the repo's ``.env`` is found, and the default relative SQLite
path (``./french_coach.db``) points at the app's database.

Nothing here prints: stdout carries the MCP JSON-RPC stream.
"""

import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent


def bootstrap() -> Path:
    """Make the repo root importable and the current working directory.

    Returns:
        The repo root path.
    """
    root = str(REPO_ROOT)
    if root not in sys.path:
        sys.path.insert(0, root)
    os.chdir(REPO_ROOT)
    return REPO_ROOT


def main() -> None:
    """Bootstrap the environment, then serve the MCP tools over stdio."""
    bootstrap()
    # Project imports must come after bootstrap() so they resolve from the repo root.
    from mcp_server.server import create_server

    create_server().run("stdio")


if __name__ == "__main__":
    main()
