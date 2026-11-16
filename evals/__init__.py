"""Offline evaluation data and tooling for the French Language Coach.

Holds the hand-labeled feedback dataset (issue #230) and the feedback eval
harness (issue #231, ``python3 -m evals.run_feedback_eval``). Nothing in the app
imports this package, and no CI workflow runs the harness (it makes paid API
calls).
"""
