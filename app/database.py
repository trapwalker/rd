"""Database connection and initialization using Motor and Beanie."""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import Settings

logger = logging.getLogger(__name__)


class Database:
    """Database manager for async MongoDB operations."""

    client: AsyncIOMotorClient | None = None
    database: AsyncIOMotorDatabase | None = None

    @classmethod
    async def connect(cls, settings: Settings) -> None:
        """Connect to MongoDB and initialize Beanie."""
        logger.info(f"Connecting to MongoDB: {settings.database_name}")

        cls.client = AsyncIOMotorClient(
            settings.mongodb_uri,
            maxPoolSize=50,
            minPoolSize=10,
            maxIdleTimeMS=45000,
        )

        cls.database = cls.client[settings.database_name]

        # Import all document models here
        from app.models import User  # Will create this next

        # Initialize Beanie with document models
        await init_beanie(
            database=cls.database,
            document_models=[
                User,
                # Add more models as they are migrated
            ],
        )

        logger.info("Database connection established")

    @classmethod
    async def disconnect(cls) -> None:
        """Close database connection."""
        if cls.client:
            cls.client.close()
            logger.info("Database connection closed")

    @classmethod
    def get_database(cls) -> AsyncIOMotorDatabase:
        """Get database instance."""
        if cls.database is None:
            raise RuntimeError("Database not initialized")
        return cls.database

    @classmethod
    def get_client(cls) -> AsyncIOMotorClient:
        """Get MongoDB client instance."""
        if cls.client is None:
            raise RuntimeError("Database not initialized")
        return cls.client


@asynccontextmanager
async def get_db_session() -> AsyncGenerator[AsyncIOMotorDatabase, None]:
    """
    Get database session with transaction support.

    Note: MongoDB transactions require a replica set.
    This will fail on standalone MongoDB instances.
    """
    db = Database.get_database()
    client = Database.get_client()

    session = await client.start_session()
    try:
        async with session.start_transaction():
            yield db
            # Transaction commits automatically on successful exit
    except Exception:
        # Transaction aborts automatically on exception
        raise
    finally:
        await session.end_session()
