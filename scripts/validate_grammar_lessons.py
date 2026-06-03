#!/usr/bin/env python3
"""Validation script for grammar lesson JSON files.

This script validates grammar lesson JSON files against the schema
defined in schemas/grammar_lesson.json using both JSON Schema and
Pydantic validation.

Usage:
    python scripts/validate_grammar_lessons.py [options] <file_or_directory>

Arguments:
    file_or_directory    Path to a JSON file or directory containing JSON files

Options:
    --json-schema        Use JSON Schema validation (requires jsonschema library)
    --pydantic           Use Pydantic validation (default)
    --strict             Enable strict mode (fail on warnings)
    --quiet              Suppress informational output (only show errors)
    --version            Show version and exit
    --help               Show this help message and exit

Exit Codes:
    0   All validations passed
    1   Validation errors found
    2   File/directory not found or other error

Examples:
    # Validate a single file
    python scripts/validate_grammar_lessons.py data/grammar_lessons/present-tense.json

    # Validate all lessons in a directory
    python scripts/validate_grammar_lessons.py data/grammar_lessons/

    # Use JSON Schema validation
    python scripts/validate_grammar_lessons.py --json-schema data/grammar_lessons/
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Any

# Add parent directory to path for imports
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from schemas.grammar_lesson import (
    GrammarLesson,
    load_lesson_from_file,
    load_lessons_from_directory,
    validate_lesson_data,
    validate_lesson_json,
)


def print_error(message: str, file_path: str | None = None) -> None:
    """Print an error message with optional file context."""
    if file_path:
        print(f"  [ERROR] {file_path}: {message}", file=sys.stderr)
    else:
        print(f"  [ERROR] {message}", file=sys.stderr)


def print_warning(message: str, file_path: str | None = None) -> None:
    """Print a warning message with optional file context."""
    if file_path:
        print(f"  [WARN]  {file_path}: {message}", file=sys.stderr)
    else:
        print(f"  [WARN]  {message}", file=sys.stderr)


def print_info(message: str, verbose: bool = True) -> None:
    """Print an informational message if verbose mode is enabled."""
    if verbose:
        print(f"  [INFO]  {message}")


def validate_with_pydantic(file_path: Path | str, strict: bool = False) -> tuple[bool, list[str]]:
    """Validate a lesson file using Pydantic.
    
    Args:
        file_path: Path to the JSON file
        strict: If True, raise on warnings; if False, collect warnings
        
    Returns:
        Tuple of (is_valid, list of error/warning messages)
    """
    path = Path(file_path)
    messages: list[str] = []
    
    try:
        lesson = load_lesson_from_file(path)
        
        # Check for potential issues that Pydantic might not catch
        if not isinstance(lesson.id, str) or not lesson.id.strip():
            messages.append("Lesson ID must be a non-empty string")
            return False, messages
        
        if not isinstance(lesson.title, str) or not lesson.title.strip():
            messages.append("Lesson title must be a non-empty string")
            return False, messages
        
        if not isinstance(lesson.topic, str) or not lesson.topic.strip():
            messages.append("Lesson topic must be a non-empty string")
            return False, messages
        
        if len(lesson.sections) == 0:
            messages.append("Lesson must have at least one section")
            return False, messages
        
        for i, section in enumerate(lesson.sections):
            if not isinstance(section.title, str) or not section.title.strip():
                messages.append(f"Section {i} title must be a non-empty string")
                return False, messages
            
            if not isinstance(section.content, str) or not section.content.strip():
                messages.append(f"Section {i} content must be a non-empty string")
                return False, messages
        
        return True, messages
        
    except FileNotFoundError as e:
        messages.append(f"File not found: {e}")
        return False, messages
    except json.JSONDecodeError as e:
        messages.append(f"Invalid JSON: {e}")
        return False, messages
    except Exception as e:
        messages.append(f"Validation error: {e}")
        return False, messages


def validate_with_json_schema(file_path: Path | str) -> tuple[bool, list[str]]:
    """Validate a lesson file using JSON Schema.
    
    Note: This function requires the jsonschema library to be installed.
    If jsonschema is not available, it will fall back to Pydantic validation.
    
    Args:
        file_path: Path to the JSON file
        
    Returns:
        Tuple of (is_valid, list of error/warning messages)
    """
    try:
        import jsonschema
        from jsonschema import Draft7Validator
    except ImportError:
        # jsonschema not installed, warn and fall back
        return validate_with_pydantic(file_path)
    
    path = Path(file_path)
    messages: list[str] = []
    
    try:
        # Load the schema
        schema_path = PROJECT_ROOT / "schemas" / "grammar_lesson.json"
        if not schema_path.exists():
            messages.append(f"Schema file not found: {schema_path}")
            return False, messages
        
        schema = json.loads(schema_path.read_text(encoding='utf-8'))
        
        # Load the lesson data
        lesson_data = json.loads(path.read_text(encoding='utf-8'))
        
        # Validate
        validator = Draft7Validator(schema)
        errors = sorted(validator.iter_errors(lesson_data), key=lambda e: e.path)
        
        if errors:
            for error in errors:
                path_str = ".".join(str(p) for p in error.absolute_path) or "(root)"
                messages.append(f"{path_str}: {error.message}")
            return False, messages
        
        return True, messages
        
    except FileNotFoundError as e:
        messages.append(f"File not found: {e}")
        return False, messages
    except json.JSONDecodeError as e:
        messages.append(f"Invalid JSON: {e}")
        return False, messages
    except Exception as e:
        messages.append(f"JSON Schema validation error: {e}")
        return False, messages


def validate_file(file_path: Path | str, method: str = "pydantic", strict: bool = False) -> bool:
    """Validate a single lesson file.
    
    Args:
        file_path: Path to the JSON file
        method: Validation method to use ("pydantic" or "json-schema")
        strict: If True, fail on warnings
        
    Returns:
        True if validation passed, False otherwise
    """
    path = Path(file_path)
    
    if not path.exists():
        print_error(f"File not found: {path}")
        return False
    
    if not path.suffix.lower() == ".json":
        print_warning(f"Skipping non-JSON file: {path}")
        return True
    
    if method == "json-schema":
        is_valid, messages = validate_with_json_schema(path)
    else:
        is_valid, messages = validate_with_pydantic(path)
    
    if is_valid:
        print_info(f"Valid: {path}")
        return True
    else:
        for message in messages:
            print_error(message, str(path))
        return False


def validate_directory(directory_path: Path | str, method: str = "pydantic", strict: bool = False) -> bool:
    """Validate all lesson files in a directory.
    
    Args:
        directory_path: Path to the directory containing JSON files
        method: Validation method to use ("pydantic" or "json-schema")
        strict: If True, fail on warnings
        
    Returns:
        True if all validations passed, False otherwise
    """
    path = Path(directory_path)
    
    if not path.exists():
        print_error(f"Directory not found: {path}")
        return False
    
    if not path.is_dir():
        # It's a file, validate it directly
        return validate_file(path, method, strict)
    
    # Collect all JSON files
    json_files = sorted(path.glob("*.json"))
    
    if not json_files:
        print_warning(f"No JSON files found in: {path}")
        return True
    
    print_info(f"Found {len(json_files)} JSON file(s) in {path}")
    
    # Validate each file
    all_valid = True
    for json_file in json_files:
        if not validate_file(json_file, method, strict):
            all_valid = False
    
    return all_valid


def main() -> int:
    """Main entry point for the validation script.
    
    Returns:
        Exit code (0 = success, 1 = validation errors, 2 = other error)
    """
    parser = argparse.ArgumentParser(
        description="Validate grammar lesson JSON files against the schema",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    
    parser.add_argument(
        "path",
        nargs="?",
        default="data/grammar_lessons",
        help="Path to JSON file or directory (default: data/grammar_lessons)"
    )
    
    parser.add_argument(
        "--json-schema",
        action="store_true",
        default=False,
        help="Use JSON Schema validation (requires jsonschema library)"
    )
    
    parser.add_argument(
        "--pydantic",
        action="store_true",
        default=False,
        help="Use Pydantic validation (default)"
    )
    
    parser.add_argument(
        "--strict",
        action="store_true",
        default=False,
        help="Fail on warnings"
    )
    
    parser.add_argument(
        "--quiet",
        action="store_true",
        default=False,
        help="Suppress informational output"
    )
    
    parser.add_argument(
        "--version",
        action="version",
        version="%(prog)s 1.0.0"
    )
    
    args = parser.parse_args()
    
    # Determine validation method
    if args.json_schema:
        method = "json-schema"
    else:
        method = "pydantic"  # Default
    
    # Set verbose mode
    verbose = not args.quiet
    
    if verbose:
        print(f"Validating grammar lessons with {method} method...")
        if args.strict:
            print("Strict mode: enabled")
        print()
    
    # Get the path
    path = Path(args.path)
    
    if not path.exists():
        print_error(f"Path not found: {path}")
        return 2
    
    # Validate
    try:
        if path.is_dir():
            success = validate_directory(path, method, args.strict)
        else:
            success = validate_file(path, method, args.strict)
    except Exception as e:
        print_error(f"Unexpected error: {e}")
        return 2
    
    if verbose:
        print()
        if success:
            print("✓ All validations passed!")
        else:
            print("✗ Validation errors found!")
    
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
