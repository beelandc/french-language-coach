# Test Scenarios for [Feature Name]

**GitHub Issue**: #[Number]
**Feature**: [Feature Name]
**Artifact ID**: FLC-[SEQUENCE_NUMBER]-[TIMESTAMP]
**Created**: [YYYY-MM-DD HH:MM]

---

## Test Strategy

[Brief description of the testing approach for this feature.]

- **Unit Tests**: Test individual functions in isolation
- **Integration Tests**: Test component interactions
- **E2E Tests**: Test complete user flows

---

## Test Coverage Requirements

- [ ] Minimum 80% code coverage for new/modified code
- [ ] All acceptance criteria from issue #[Number] have corresponding tests
- [ ] Edge cases are covered
- [ ] Error cases are covered

---

## 1. Unit Test Scenarios

### [Module/Class Name] Tests

**Test Class**: `[TestClassName]`
**File**: `tests/test_[module].py`

#### `[test_method_name]`
- **Description**: [What this test verifies]
- **Function Under Test**: `[function_name]`
- **Input**: [Input parameters]
- **Expected Output**: [Expected return value]
- **Verification Points**:
  - [ ] [Point 1]
  - [ ] [Point 2]
- **Edge Cases**:
  - [ ] [Edge case 1]
  - [ ] [Edge case 2]

```python
# Example test code
def test_[description](...):
    # Given
    setup_code
    
    # When
    result = function_to_test(...)
    
    # Then
    assert result == expected_value
```

---

## 2. Integration Test Scenarios

### [Component/Endpoint Name] Integration Tests

**Test Class**: `[IntegrationTestClassName]`
**File**: `tests/integration/test_[component].py`

#### `[test_method_name]`
- **Description**: [What this integration test verifies]
- **Endpoint/Function**: [API endpoint or function]
- **Setup**: [Required setup - fixtures, mocks, etc.]
- **Action**: [What action is performed]
- **Expected Result**: [Expected outcome]
- **Verification Points**:
  - [ ] [Point 1]
  - [ ] [Point 2]

```python
# Example integration test
async def test_[description](client, ...):
    # Given
    test_data = ...
    
    # When
    response = await client.post("/endpoint", json=test_data)
    
    # Then
    assert response.status_code == 200
    assert response.json() == expected_json
```

---

## 3. Acceptance Criteria Test Mapping

[Map each acceptance criterion to specific test cases.]

| AC# | Description | Test File | Test Function | Status |
|-----|-------------|-----------|----------------|--------|
| AC1 | [Description] | `tests/test_*.py` | `test_*` | [✅/❌/⏳] |
| AC2 | [Description] | `tests/test_*.py` | `test_*` | [✅/❌/⏳] |

---

## 4. Edge Case Test Scenarios

[List edge cases that need special test coverage.]

| Scenario | Input | Expected Behavior | Test File | Status |
|----------|-------|-------------------|-----------|--------|
| [Edge case 1] | [Input] | [Expected] | `tests/test_*.py` | [✅/❌/⏳] |
| [Edge case 2] | [Input] | [Expected] | `tests/test_*.py` | [✅/❌/⏳] |

---

## 5. Error Case Test Scenarios

[List error scenarios that need to be tested.]

| Scenario | Input | Expected Error | Status Code | Test File | Status |
|----------|-------|----------------|-------------|-----------|--------|
| [Invalid input] | [Bad input] | [Error message] | 400 | `tests/test_*.py` | [✅/❌/⏳] |
| [Not found] | [Missing ID] | [Error message] | 404 | `tests/test_*.py` | [✅/❌/⏳] |

---

## 6. Test Data Fixtures

[Define test fixtures that will be needed.]

```python
# Example fixtures
@pytest.fixture
def sample_session():
    return Session(
        id="test-123",
        scenario_id="cafe",
        created_at=datetime.now(),
        # ...
    )
```

---

## 7. Coverage Checklist

Before merging, verify:

- [ ] All new functions have unit tests
- [ ] All new endpoints have integration tests
- [ ] All acceptance criteria have corresponding tests
- [ ] Edge cases are covered
- [ ] Error cases are covered
- [ ] Tests pass locally
- [ ] Coverage is at least 80%

Run coverage check:
```bash
pytest --cov=module_name --cov-report=term-missing
```

---

## Naming Conventions

- Test file names: `test_[module].py`
- Test function names: `test_[description]_when_[action]_given_[condition]`
- Or: `test_should_[expected_behavior]_when_[action]`

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
