"""DO NOT MERGE: throwaway module for the #252 coverage gate demo.

It has no tests, so the per-module coverage check must fail on it.
"""


def canary_add(a: int, b: int) -> int:
    """Untested on purpose."""
    total = a + b
    if total > 100:
        return 100
    return total


def canary_label(value: int) -> str:
    """Untested on purpose."""
    if value < 0:
        return "negative"
    if value == 0:
        return "zero"
    return "positive"
