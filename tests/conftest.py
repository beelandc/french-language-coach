"""
Pytest configuration and fixtures for French Language Coach.
"""
import asyncio
import os
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from database import Base, get_db
from models.session import Session as SessionModel
from scenarios import SCENARIOS, VALID_DIFFICULTIES

# Test database URL (in-memory SQLite for tests)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# Create test engine and session factory
async_engine = create_async_engine(TEST_DATABASE_URL)
AsyncTestingSession = sessionmaker(
    async_engine, expire_on_commit=False, class_=AsyncSession
)


async def create_test_db():
    """Create all tables in the test database."""
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def drop_test_db():
    """Drop all tables in the test database."""
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for each test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def test_db():
    """Create a fresh database for each test function."""
    await create_test_db()
    try:
        async with AsyncTestingSession() as session:
            yield session
    finally:
        await drop_test_db()


@pytest_asyncio.fixture(scope="function")
async def client(test_db):
    """Create a test client for the FastAPI app."""
    from fastapi.testclient import TestClient
    from main import app
    
    # Override the get_db dependency to use test database
    async def override_get_db():
        async with AsyncTestingSession() as session:
            yield session
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as c:
        yield c
    
    # Clean up
    app.dependency_overrides.clear()


@pytest.fixture(scope="session")
def valid_scenario_ids():
    """List of all valid scenario IDs."""
    return [s["id"] for s in SCENARIOS]


@pytest.fixture(scope="session")
def valid_difficulties():
    """Set of valid difficulty levels."""
    return VALID_DIFFICULTIES
