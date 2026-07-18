"""Pytest configuration and fixtures for testing."""

import asyncio
import os
from collections.abc import AsyncGenerator, Generator
from typing import Any

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient
from motor.motor_asyncio import AsyncIOMotorClient

from app.config import get_settings
from app.database import Database
from app.main import create_app
from app.models.user import User


@pytest.fixture(scope="session")
def test_settings():
    """Override settings for testing."""
    settings = get_settings()
    # Use test database. Matches docker-compose.yml's mongodb service, which
    # requires auth - a bare "mongodb://localhost:27017/rd_test" 404s every
    # test with "OperationFailure: requires authentication" against that
    # container. Point MONGODB_URL elsewhere if you run a separate, unauthed
    # test-only mongod instead.
    settings.mongodb_url = os.environ.get(
        "TEST_MONGODB_URL",
        "mongodb://admin:admin_password@localhost:27017/rd_test?authSource=admin",
    )
    settings.secret_key = "test-secret-key-do-not-use-in-production"
    settings.environment = "test"
    return settings


@pytest_asyncio.fixture(scope="session")
async def test_db(test_settings):
    """Setup test database."""
    # Connect to test database
    await Database.connect(test_settings)

    yield Database

    # Cleanup: drop test database
    if Database.client is not None:
        await Database.client.drop_database("rd_test")
        await Database.disconnect()


@pytest_asyncio.fixture
async def clean_db(test_db):
    """Clean database before each test."""
    # Clear all collections
    if test_db.database is not None:
        collections = await test_db.database.list_collection_names()
        for collection in collections:
            await test_db.database[collection].delete_many({})

    yield test_db


@pytest.fixture
def app(test_settings):
    """Create FastAPI test app."""
    return create_app()


@pytest.fixture
def client(app) -> TestClient:
    """Create synchronous test client."""
    return TestClient(app)


@pytest.fixture
def ws_client(test_settings) -> Generator[TestClient, None, None]:
    """TestClient с прожитым lifespan — для WebSocket-тестов.

    WebSocket-эндпоинт обращается к Mongo из портального event loop
    TestClient, поэтому Beanie должен быть инициализирован именно в нём
    (иначе Motor-клиент из чужого цикла блокируется навсегда).
    """
    saved_client, saved_database = Database.client, Database.database
    ws_app = create_app()
    with TestClient(ws_app) as c:
        yield c
    # lifespan закрыл соединение своего цикла — вернуть session-глобалы,
    # чтобы не сломать последующие async-тесты
    Database.client, Database.database = saved_client, saved_database


@pytest_asyncio.fixture
async def async_client(app) -> AsyncGenerator[AsyncClient, None]:
    """Create async test client."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac


@pytest_asyncio.fixture
async def test_user(clean_db) -> User:
    """Create test user."""
    from app.core.security import get_password_hash

    user = User(
        email="test@example.com",
        username="testuser",
        hashed_password=get_password_hash("testpassword123"),
        display_name="Test User",
        is_active=True,
        level=5,
        experience=1000,
        coins=500,
    )
    await user.insert()
    return user


@pytest_asyncio.fixture
async def test_user_token(test_user) -> str:
    """Create JWT token for test user."""
    from app.core.security import create_access_token

    return create_access_token(subject=str(test_user.id))


@pytest_asyncio.fixture
async def authenticated_client(
    async_client: AsyncClient,
    test_user_token: str
) -> AsyncClient:
    """Create authenticated async client."""
    async_client.headers["Authorization"] = f"Bearer {test_user_token}"
    return async_client


@pytest.fixture
def sample_user_data() -> dict[str, Any]:
    """Sample user registration data."""
    return {
        "email": "newuser@example.com",
        "username": "newuser",
        "password": "SecurePassword123",
    }
