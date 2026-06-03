"""Tests for GitHub issue #30: Author 20 core grammar lessons.

This module contains tests to verify all acceptance criteria from issue #30:
- 20 lessons in data/grammar_lessons/
- Each lesson has clear explanation
- Each lesson has examples
- All lessons pass schema validation
"""

import json
import glob
from pathlib import Path

import pytest

from schemas.grammar_lesson import GrammarLesson, load_lesson_from_file, load_lessons_from_directory


# =============================================================================
# Constants
# =============================================================================

LESSONS_DIR = Path(__file__).parent.parent / "data" / "grammar_lessons"
MIN_LESSON_COUNT = 20  # AC1: 20 lessons required


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def lessons_directory() -> Path:
    """Provide the path to the grammar lessons directory."""
    return LESSONS_DIR


@pytest.fixture
def all_lesson_files(lessons_directory: Path) -> list[Path]:
    """Provide list of all JSON lesson files, excluding example files."""
    # Get all JSON files, excluding example_lesson.json if it exists
    lesson_files = list(lessons_directory.glob("*.json"))
    # Filter out any files that contain "example" in the name
    lesson_files = [f for f in lesson_files if "example" not in f.name.lower()]
    return lesson_files


# =============================================================================
# Tests for Acceptance Criteria (Issue #30)
# =============================================================================

class TestIssue30AcceptanceCriteria:
    """Tests for all acceptance criteria from GitHub issue #30."""

    def test_ac1_at_least_20_lessons_exist(self, all_lesson_files: list[Path]) -> None:
        """AC1: 20 lessons in data/grammar_lessons/.
        
        Given the repository structure
        When the feature is complete
        Then there are at least 20 lesson files in the data/grammar_lessons/ directory
        """
        assert len(all_lesson_files) >= MIN_LESSON_COUNT, (
            f"Expected at least {MIN_LESSON_COUNT} lesson files, found {len(all_lesson_files)}"
        )

    def test_ac2_each_lesson_has_clear_explanation(self, all_lesson_files: list[Path]) -> None:
        """AC2: Each lesson has clear explanation.
        
        Given a lesson file
        When it is loaded
        Then it contains a clear explanation of the grammar topic
        """
        for lesson_file in all_lesson_files:
            lesson = load_lesson_from_file(lesson_file)
            
            # Check that at least one section has non-empty content (explanation)
            has_explanation = any(
                section.content and section.content.strip()
                for section in lesson.sections
            )
            
            assert has_explanation, (
                f"Lesson {lesson.id} in {lesson_file.name} has no clear explanation "
                f"(no section with non-empty content)"
            )

    def test_ac3_each_lesson_has_examples(self, all_lesson_files: list[Path]) -> None:
        """AC3: Each lesson has examples.
        
        Given a lesson file
        When it is loaded
        Then it contains practical examples demonstrating the grammar concept
        """
        for lesson_file in all_lesson_files:
            lesson = load_lesson_from_file(lesson_file)
            
            # Check that at least one section has non-empty examples
            has_examples = any(
                section.examples and len(section.examples) > 0
                for section in lesson.sections
            )
            
            assert has_examples, (
                f"Lesson {lesson.id} in {lesson_file.name} has no examples "
                f"(no section with examples)"
            )

    def test_ac4_all_lessons_pass_schema_validation(self, all_lesson_files: list[Path]) -> None:
        """AC4: All lessons pass schema validation.
        
        Given all lesson files
        When validated against the lesson schema
        Then all lessons pass validation without errors
        """
        validation_errors = []
        
        for lesson_file in all_lesson_files:
            try:
                # This will raise ValidationError if validation fails
                lesson = load_lesson_from_file(lesson_file)
                # Additional validation: check that the lesson has the required structure
                assert lesson.id
                assert lesson.title
                assert lesson.topic
                assert lesson.difficulty
                assert lesson.sections
                
            except Exception as e:
                validation_errors.append({
                    'file': lesson_file.name,
                    'error': str(e)
                })
        
        if validation_errors:
            error_messages = [
                f"File: {e['file']}, Error: {e['error']}"
                for e in validation_errors
            ]
            pytest.fail(f"Schema validation failed for {len(validation_errors)} lesson(s):\n" + 
                       "\n".join(error_messages))


# =============================================================================
# Additional Validation Tests
# =============================================================================

class TestLessonContentQuality:
    """Additional tests for lesson content quality."""

    def test_all_lessons_have_unique_ids(self, all_lesson_files: list[Path]) -> None:
        """Verify that all lessons have unique IDs."""
        lessons_data = load_lessons_from_directory(LESSONS_DIR)
        
        # Check for duplicate IDs (excluding example lessons)
        ids = [id for id in lessons_data.keys() if "example" not in id]
        assert len(ids) == len(set(ids)), f"Duplicate lesson IDs found: {ids}"

    def test_all_lessons_have_valid_difficulty(self, all_lesson_files: list[Path]) -> None:
        """Verify that all lessons have valid difficulty levels."""
        valid_difficulties = ["beginner", "intermediate", "advanced"]
        
        for lesson_file in all_lesson_files:
            lesson = load_lesson_from_file(lesson_file)
            assert lesson.difficulty.value in valid_difficulties, (
                f"Lesson {lesson.id} has invalid difficulty: {lesson.difficulty}"
            )

    def test_all_lessons_have_valid_topic(self, all_lesson_files: list[Path]) -> None:
        """Verify that all lessons have non-empty topics."""
        for lesson_file in all_lesson_files:
            lesson = load_lesson_from_file(lesson_file)
            assert lesson.topic and lesson.topic.strip(), (
                f"Lesson {lesson.id} has empty or whitespace-only topic"
            )

    def test_all_lessons_have_valid_title(self, all_lesson_files: list[Path]) -> None:
        """Verify that all lessons have non-empty titles."""
        for lesson_file in all_lesson_files:
            lesson = load_lesson_from_file(lesson_file)
            assert lesson.title and lesson.title.strip(), (
                f"Lesson {lesson.id} has empty or whitespace-only title"
            )

    def test_all_sections_have_valid_titles(self, all_lesson_files: list[Path]) -> None:
        """Verify that all sections in all lessons have non-empty titles."""
        for lesson_file in all_lesson_files:
            lesson = load_lesson_from_file(lesson_file)
            for section in lesson.sections:
                assert section.title and section.title.strip(), (
                    f"Lesson {lesson.id} has a section with empty or whitespace-only title"
                )

    def test_all_sections_have_valid_content(self, all_lesson_files: list[Path]) -> None:
        """Verify that all sections in all lessons have non-empty content."""
        for lesson_file in all_lesson_files:
            lesson = load_lesson_from_file(lesson_file)
            for section in lesson.sections:
                assert section.content and section.content.strip(), (
                    f"Lesson {lesson.id} has a section with empty or whitespace-only content"
                )

    def test_all_example_strings_are_non_empty(self, all_lesson_files: list[Path]) -> None:
        """Verify that all example strings are non-empty."""
        for lesson_file in all_lesson_files:
            lesson = load_lesson_from_file(lesson_file)
            for section in lesson.sections:
                for example in section.examples:
                    assert example and example.strip(), (
                        f"Lesson {lesson.id} has an empty or whitespace-only example string"
                    )


# =============================================================================
# Integration Tests
# =============================================================================

class TestLessonsDirectoryStructure:
    """Tests for the directory structure and file organization."""

    def test_lessons_directory_exists(self, lessons_directory: Path) -> None:
        """Verify that the grammar_lessons directory exists."""
        assert lessons_directory.exists(), "data/grammar_lessons/ directory does not exist"
        assert lessons_directory.is_dir(), "data/grammar_lessons/ is not a directory"

    def test_lesson_files_are_json(self, all_lesson_files: list[Path]) -> None:
        """Verify that all lesson files have .json extension."""
        for lesson_file in all_lesson_files:
            assert lesson_file.suffix == ".json", (
                f"Lesson file {lesson_file.name} is not a JSON file"
            )

    def test_lesson_files_are_utf8_encoded(self, all_lesson_files: list[Path]) -> None:
        """Verify that all lesson files are UTF-8 encoded."""
        for lesson_file in all_lesson_files:
            try:
                with open(lesson_file, 'r', encoding='utf-8') as f:
                    f.read()
            except UnicodeDecodeError as e:
                pytest.fail(f"File {lesson_file.name} is not UTF-8 encoded: {e}")

    def test_lesson_files_are_valid_json(self, all_lesson_files: list[Path]) -> None:
        """Verify that all lesson files contain valid JSON."""
        for lesson_file in all_lesson_files:
            try:
                with open(lesson_file, 'r', encoding='utf-8') as f:
                    json.load(f)
            except json.JSONDecodeError as e:
                pytest.fail(f"File {lesson_file.name} contains invalid JSON: {e}")


# =============================================================================
# Reporting
# =============================================================================

class TestLessonReport:
    """Tests that report on the lesson collection."""

    def test_report_lesson_count(self, all_lesson_files: list[Path]) -> None:
        """Generate a report of the lesson collection."""
        lessons_data = load_lessons_from_directory(LESSONS_DIR)
        # Exclude example lessons from count
        lesson_count = len([id for id in lessons_data.keys() if "example" not in id])
        
        print(f"\n{'='*60}")
        print(f"Grammar Lessons Report (Issue #30)")
        print(f"{'='*60}")
        print(f"Total lessons found: {lesson_count}")
        print(f"Minimum required: {MIN_LESSON_COUNT}")
        print(f"Status: {'✓ PASS' if lesson_count >= MIN_LESSON_COUNT else '✗ FAIL'}")
        print(f"{'='*60}")

    def test_report_all_lessons(self, all_lesson_files: list[Path]) -> None:
        """Generate a detailed report of all lessons."""
        lessons_data = load_lessons_from_directory(LESSONS_DIR)
        
        print(f"\n{'='*80}")
        print(f"Detailed Lesson Listing")
        print(f"{'='*80}")
        
        for lesson_id, lesson in sorted(lessons_data.items()):
            if "example" not in lesson_id:
                print(f"  - {lesson.id}")
                print(f"    Title: {lesson.title}")
                print(f"    Topic: {lesson.topic}")
                print(f"    Difficulty: {lesson.difficulty}")
                print(f"    Sections: {len(lesson.sections)}")
                
                # Count examples
                total_examples = sum(len(section.examples) for section in lesson.sections)
                print(f"    Examples: {total_examples}")
                print()
        
        print(f"{'='*80}")
