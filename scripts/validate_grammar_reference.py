#!/usr/bin/env python3
"""Validation script for grammar reference JSON files.

This script validates grammar reference JSON files against the schema
defined in schemas/grammar_reference.py using Pydantic validation.

Usage:
    python scripts/validate_grammar_reference.py [options] <file_or_directory>

Arguments:
    file_or_directory    Path to a JSON file or directory containing JSON files

Options:
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
    python scripts/validate_grammar_reference.py data/grammar/reference/subjunctive-present.json

    # Validate all references in a directory
    python scripts/validate_grammar_reference.py data/grammar/reference/
"""

import argparse
import json
import sys
from pathlib import Path

# Add parent directory to path for imports
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from schemas.grammar_reference import (
    GrammarReference,
    load_reference_from_file,
    load_references_from_directory,
    validate_reference_data,
    validate_reference_json,
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


def validate_file(file_path: Path | str, strict: bool = False, verbose: bool = True) -> tuple[bool, list[str]]:
    """Validate a single reference file using Pydantic.
    
    Args:
        file_path: Path to the JSON file
        strict: If True, raise on warnings
        verbose: If True, print informational messages
        
    Returns:
        Tuple of (is_valid, list of error/warning messages)
    """
    path = Path(file_path)
    messages: list[str] = []
    
    try:
        reference = load_reference_from_file(path)
        
        # Check for potential issues that Pydantic might not catch
        if not isinstance(reference.id, str) or not reference.id.strip():
            messages.append("Reference ID must be a non-empty string")
            return False, messages
        
        if not isinstance(reference.term, str) or not reference.term.strip():
            messages.append("Reference term must be a non-empty string")
            return False, messages
        
        if not isinstance(reference.definition, str) or not reference.definition.strip():
            messages.append("Reference definition must be a non-empty string")
            return False, messages
        
        if len(reference.examples) < 2:
            messages.append("Reference must have at least 2 examples")
            return False, messages
        
        if len(reference.common_pitfalls) < 1:
            messages.append("Reference must have at least 1 common pitfall")
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


def validate_directory(directory_path: Path | str, strict: bool = False, verbose: bool = True) -> tuple[bool, int, int]:
    """Validate all reference files in a directory.
    
    Args:
        directory_path: Path to the directory containing JSON files
        strict: If True, fail on warnings
        verbose: If True, print informational messages
        
    Returns:
        Tuple of (all_valid, valid_count, total_count)
    """
    path = Path(directory_path)
    
    if not path.exists():
        print_error(f"Directory not found: {path}")
        return False, 0, 0
    
    if not path.is_dir():
        # It's a file, validate it directly
        is_valid, messages = validate_file(path, strict, verbose)
        if is_valid:
            return True, 1, 1
        else:
            for message in messages:
                print_error(message, str(path))
            return False, 0, 1
    
    # Collect all JSON files
    json_files = sorted(path.glob("*.json"))
    
    if not json_files:
        print_warning(f"No JSON files found in: {path}")
        return True, 0, 0
    
    print_info(f"Found {len(json_files)} JSON file(s) in {path}")
    
    # Validate each file
    all_valid = True
    valid_count = 0
    
    for json_file in json_files:
        is_valid, messages = validate_file(json_file, strict, verbose)
        if is_valid:
            valid_count += 1
            if verbose:
                print(f"  [OK]    {json_file.name}")
        else:
            all_valid = False
            for message in messages:
                print_error(message, str(json_file))
    
    return all_valid, valid_count, len(json_files)


def main() -> int:
    """Main entry point for the validation script.
    
    Returns:
        Exit code (0 = success, 1 = validation errors, 2 = other error)
    """
    parser = argparse.ArgumentParser(
        description="Validate grammar reference JSON files against the schema",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    
    parser.add_argument(
        "path",
        nargs="?",
        default="data/grammar/reference",
        help="Path to JSON file or directory (default: data/grammar/reference)"
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
    
    # Set verbose mode
    verbose = not args.quiet
    
    if verbose:
        print("Validating grammar reference entries...")
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
            success, valid_count, total_count = validate_directory(path, args.strict, verbose)
        else:
            is_valid, messages = validate_file(path, args.strict, verbose)
            success = is_valid
            valid_count = 1 if is_valid else 0
            total_count = 1
    except Exception as e:
        print_error(f"Unexpected error: {e}")
        return 2
    
    if verbose:
        print()
        if success:
            print(f"✓ All {valid_count} reference entry(ies) are valid!")
        else:
            print(f"✗ Found {total_count - valid_count} invalid entry(ies) out of {total_count}")
    
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
