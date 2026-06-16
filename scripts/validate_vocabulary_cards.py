#!/usr/bin/env python3
"""Validation script for vocabulary card JSON files.

This script validates vocabulary card JSON files against the schema
defined in schemas/vocabulary_card.json using both JSON Schema and
Pydantic validation.

Usage:
    python3 scripts/validate_vocabulary_cards.py [options] <file_or_directory>

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
    python3 scripts/validate_vocabulary_cards.py data/vocabulary_cards/hello.json

    # Validate all cards in a directory
    python3 scripts/validate_vocabulary_cards.py data/vocabulary_cards/

    # Use JSON Schema validation
    python3 scripts/validate_vocabulary_cards.py --json-schema data/vocabulary_cards/

    # Use Pydantic validation (default)
    python3 scripts/validate_vocabulary_cards.py --pydantic data/vocabulary_cards/
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Any

# Add parent directory to path for imports
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from schemas.vocabulary_card import (
    VocabularyCard,
    load_card_from_file,
    load_cards_from_directory,
    validate_card_data,
    validate_card_json,
)


VERSION = "1.0.0"


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


def validate_with_pydantic(file_path: Path | str, strict: bool = False, verbose: bool = True) -> tuple[bool, list[str]]:
    """Validate a card file using Pydantic.
    
    Args:
        file_path: Path to the JSON file
        strict: If True, raise on warnings; if False, collect warnings
        verbose: If True, print informational messages
        
    Returns:
        Tuple of (is_valid, list of error/warning messages)
    """
    path = Path(file_path)
    messages: list[str] = []
    
    try:
        card = load_card_from_file(path)
        
        # Check for potential issues that Pydantic might not catch
        if not isinstance(card.deck_id, str) or not card.deck_id.strip():
            messages.append("Card deck_id must be a non-empty string")
            return False, messages
        
        if not isinstance(card.card_id, str) or not card.card_id.strip():
            messages.append("Card card_id must be a non-empty string")
            return False, messages
        
        if not isinstance(card.front, str) or not card.front.strip():
            messages.append("Card front must be a non-empty string")
            return False, messages
        
        if not isinstance(card.back, str) or not card.back.strip():
            messages.append("Card back must be a non-empty string")
            return False, messages
        
        if not isinstance(card.difficulty, int) or not (1 <= card.difficulty <= 5):
            messages.append("Card difficulty must be an integer between 1 and 5")
            return False, messages
        
        if card.example is not None and not isinstance(card.example, str):
            messages.append("Card example must be a string if present")
            return False, messages
        
        if card.context is not None and not isinstance(card.context, str):
            messages.append("Card context must be a string if present")
            return False, messages
        
        if not isinstance(card.tags, list):
            messages.append("Card tags must be an array")
            return False, messages
        
        for tag in card.tags:
            if not isinstance(tag, str) or not tag.strip():
                messages.append(f"Tag '{tag}' is not a valid string")
                if strict:
                    return False, messages
        
        print_info(f"Validated: {path}", verbose)
        return True, messages
        
    except FileNotFoundError as e:
        messages.append(str(e))
        return False, messages
    except Exception as e:
        messages.append(f"Validation error: {str(e)}")
        return False, messages


def validate_with_json_schema(file_path: Path | str, verbose: bool = True) -> tuple[bool, list[str]]:
    """Validate a card file using JSON Schema.
    
    Args:
        file_path: Path to the JSON file
        verbose: If True, print informational messages
        
    Returns:
        Tuple of (is_valid, list of error/warning messages)
    """
    try:
        import jsonschema
    except ImportError:
        return False, ["jsonschema library not installed. Install with: pip install jsonschema"]
    
    path = Path(file_path)
    messages: list[str] = []
    
    try:
        # Load the schema
        schema_path = PROJECT_ROOT / "schemas" / "vocabulary_card.json"
        if not schema_path.exists():
            return False, [f"Schema file not found: {schema_path}"]
        
        schema_data = json.loads(schema_path.read_text(encoding='utf-8'))
        
        # Load the card data
        card_data = json.loads(path.read_text(encoding='utf-8'))
        
        # Validate
        validator = jsonschema.Draft7Validator(schema_data)
        errors = list(validator.iter_errors(card_data))
        
        if errors:
            for error in errors:
                messages.append(f"JSON Schema validation error: {error.message} (path: {'.'.join(map(str, error.path))})")
            return False, messages
        
        print_info(f"Validated: {path}", verbose)
        return True, messages
        
    except json.JSONDecodeError as e:
        messages.append(f"Invalid JSON: {str(e)}")
        return False, messages
    except FileNotFoundError as e:
        messages.append(str(e))
        return False, messages
    except Exception as e:
        messages.append(f"Validation error: {str(e)}")
        return False, messages


def validate_file(file_path: Path | str, use_json_schema: bool = False, strict: bool = False, verbose: bool = True) -> tuple[bool, list[str]]:
    """Validate a single vocabulary card file.
    
    Args:
        file_path: Path to the JSON file
        use_json_schema: If True, use JSON Schema validation; otherwise use Pydantic
        strict: If True, fail on warnings
        verbose: If True, print informational messages
        
    Returns:
        Tuple of (is_valid, list of error/warning messages)
    """
    path = Path(file_path)
    
    if use_json_schema:
        return validate_with_json_schema(path, verbose)
    else:
        return validate_with_pydantic(path, strict, verbose)


def validate_directory(directory_path: Path | str, use_json_schema: bool = False, strict: bool = False, verbose: bool = True) -> tuple[bool, list[str]]:
    """Validate all vocabulary card files in a directory.
    
    Args:
        directory_path: Path to the directory containing JSON files
        use_json_schema: If True, use JSON Schema validation; otherwise use Pydantic
        strict: If True, fail on warnings
        verbose: If True, print informational messages
        
    Returns:
        Tuple of (all_valid, list of all error/warning messages)
    """
    path = Path(directory_path)
    
    if not path.exists():
        return False, [f"Directory not found: {path}"]
    
    if not path.is_dir():
        return False, [f"Path is not a directory: {path}"]
    
    all_messages: list[str] = []
    all_valid = True
    
    json_files = list(path.glob("*.json"))
    if not json_files:
        all_messages.append(f"No JSON files found in directory: {path}")
        return False, all_messages
    
    print_info(f"Found {len(json_files)} JSON file(s) in {path}", verbose)
    
    for json_file in json_files:
        is_valid, messages = validate_file(
            json_file, 
            use_json_schema=use_json_schema, 
            strict=strict, 
            verbose=verbose
        )
        
        if not is_valid:
            all_valid = False
        
        all_messages.extend(messages)
    
    return all_valid, all_messages


def main() -> int:
    """Main entry point for the validation script."""
    parser = argparse.ArgumentParser(
        description="Validate vocabulary card JSON files",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    
    parser.add_argument(
        "path",
        nargs="?",
        help="Path to a JSON file or directory containing JSON files"
    )
    
    parser.add_argument(
        "--json-schema",
        action="store_true",
        help="Use JSON Schema validation (requires jsonschema library)"
    )
    
    parser.add_argument(
        "--pydantic",
        action="store_true",
        default=True,
        help="Use Pydantic validation (default)"
    )
    
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Enable strict mode (fail on warnings)"
    )
    
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Suppress informational output (only show errors)"
    )
    
    parser.add_argument(
        "--version",
        action="version",
        version=f"%(prog)s {VERSION}"
    )
    
    args = parser.parse_args()
    
    verbose = not args.quiet
    
    if not args.path:
        print("Error: No path specified. Use --help for usage information.", file=sys.stderr)
        return 2
    
    path = Path(args.path)
    
    if path.is_file():
        # Validate single file
        use_json_schema = args.json_schema
        is_valid, messages = validate_file(
            path,
            use_json_schema=use_json_schema,
            strict=args.strict,
            verbose=verbose
        )
    elif path.is_dir():
        # Validate directory
        use_json_schema = args.json_schema
        is_valid, messages = validate_directory(
            path,
            use_json_schema=use_json_schema,
            strict=args.strict,
            verbose=verbose
        )
    else:
        print_error(f"Path not found: {path}")
        return 2
    
    # Print messages
    for message in messages:
        if "[INFO]" in message:
            print_info(message, verbose)
        elif "[WARN]" in message:
            print_warning(message)
        elif "[ERROR]" in message:
            print_error(message)
        else:
            print_error(message)
    
    if is_valid and messages:
        # Only warnings
        return 0
    elif is_valid:
        if verbose:
            print("\nAll vocabulary cards validated successfully!")
        return 0
    else:
        if verbose:
            print("\nValidation failed with errors.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
