"""Tests for the BaseSchema class.

This module contains unit tests for the BaseSchema base class
that all API schemas can optionally inherit from.
"""
import pytest
from pydantic import ValidationError

from schemas.base import BaseSchema


class TestBaseSchemaBasics:
    """Test basic BaseSchema functionality."""
    
    def test_base_schema_is_pydantic_model(self):
        """Test that BaseSchema inherits from pydantic.BaseModel."""
        from pydantic import BaseModel as PydanticBaseModel
        assert issubclass(BaseSchema, PydanticBaseModel)
    
    def test_base_schema_can_be_instantiated(self):
        """Test that BaseSchema can be instantiated."""
        schema = BaseSchema()
        assert schema is not None
    
    def test_base_schema_has_from_attributes_config(self):
        """Test that BaseSchema has from_attributes config enabled."""
        # Check that the Config class has from_attributes
        assert hasattr(BaseSchema.Config, 'from_attributes')
        assert BaseSchema.Config.from_attributes is True


class TestBaseSchemaInheritance:
    """Test that child schemas properly inherit from BaseSchema."""
    
    def test_child_schema_inherits_from_base_schema(self):
        """Test that a child schema inherits from BaseSchema."""
        class TestSchema(BaseSchema):
            name: str
            value: int
        
        # Verify inheritance
        assert issubclass(TestSchema, BaseSchema)
        
        # Verify the child schema has its own fields
        schema = TestSchema(name="test", value=42)
        assert schema.name == "test"
        assert schema.value == 42
    
    def test_child_schema_validates_correctly(self):
        """Test that child schema validation works correctly."""
        class TestSchema(BaseSchema):
            name: str
            value: int
        
        # Valid data should work
        schema = TestSchema(name="test", value=42)
        assert schema.name == "test"
        assert schema.value == 42
        
        # Invalid data should raise ValidationError
        with pytest.raises(ValidationError):
            TestSchema(name="test", value="not an int")


class TestBaseSchemaWithOptionalFields:
    """Test BaseSchema with optional fields."""
    
    def test_child_schema_with_optional_fields(self):
        """Test child schema with optional fields."""
        from typing import Optional
        
        class TestSchema(BaseSchema):
            required_field: str
            optional_field: Optional[str] = None
        
        # Should work with only required field
        schema = TestSchema(required_field="test")
        assert schema.required_field == "test"
        assert schema.optional_field is None
        
        # Should work with both fields
        schema = TestSchema(required_field="test", optional_field="optional")
        assert schema.required_field == "test"
        assert schema.optional_field == "optional"


class TestBaseSchemaModelSerialization:
    """Test BaseSchema serialization capabilities."""
    
    def test_child_schema_model_dump(self):
        """Test that child schema can be dumped to dict."""
        class TestSchema(BaseSchema):
            name: str
            value: int
        
        schema = TestSchema(name="test", value=42)
        data = schema.model_dump()
        
        assert data == {"name": "test", "value": 42}
    
    def test_child_schema_model_dump_json(self):
        """Test that child schema can be dumped to JSON."""
        class TestSchema(BaseSchema):
            name: str
            value: int
        
        schema = TestSchema(name="test", value=42)
        json_str = schema.model_dump_json()
        
        assert '"name":"test"' in json_str
        assert '"value":42' in json_str


class TestBaseSchemaFromAttributes:
    """Test BaseSchema from_attributes functionality."""
    
    def test_from_attributes_with_object(self):
        """Test that child schema can be created from an object's attributes."""
        class DataClass:
            name: str = "test"
            value: int = 42
        
        class TestSchema(BaseSchema):
            name: str
            value: int
        
        data_obj = DataClass()
        schema = TestSchema.model_validate(data_obj)
        
        assert schema.name == "test"
        assert schema.value == 42


class TestExistingSchemaCompatibility:
    """Test that existing schemas still work correctly."""
    
    def test_session_schemas_still_work(self):
        """Test that Session schemas still work after BaseSchema introduction."""
        from schemas.session import SessionCreate, SessionResponse
        from datetime import datetime
        
        # SessionCreate should work
        create_schema = SessionCreate(scenario_id="test_scenario")
        assert create_schema.scenario_id == "test_scenario"
        assert create_schema.difficulty == "intermediate"
        
        # SessionResponse should work
        response_schema = SessionResponse(
            id=1,
            scenario_id="test_scenario",
            difficulty="intermediate",
            created_at=datetime.utcnow(),
            messages=[]
        )
        assert response_schema.id == 1
        assert response_schema.scenario_id == "test_scenario"
    
    def test_lesson_progress_schemas_still_work(self):
        """Test that LessonProgress schemas still work after BaseSchema introduction."""
        from schemas.lesson_progress import LessonProgressCreate, LessonProgressResponse
        from datetime import datetime
        
        # LessonProgressCreate should work
        create_schema = LessonProgressCreate(lesson_id="test_lesson")
        assert create_schema.lesson_id == "test_lesson"
        assert create_schema.completed is False
        assert create_schema.score == 0
        
        # LessonProgressResponse should work
        response_schema = LessonProgressResponse(
            id=1,
            lesson_id="test_lesson",
            user_id=None,
            completed=False,
            score=0,
            last_accessed=datetime.utcnow(),
            time_spent=0,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        assert response_schema.id == 1
        assert response_schema.lesson_id == "test_lesson"
