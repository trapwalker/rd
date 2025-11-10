"""User model with Beanie ODM."""

from datetime import datetime
from typing import Annotated

from beanie import Document, Indexed
from pydantic import EmailStr, Field


class User(Document):
    """User document model."""

    # Authentication
    email: Annotated[EmailStr, Indexed(unique=True)]
    username: Annotated[str, Indexed(unique=True)] = Field(min_length=3, max_length=50)
    hashed_password: str

    # Profile
    display_name: str | None = None
    avatar_url: str | None = None

    # Game data
    level: int = Field(default=1, ge=1)
    experience: int = Field(default=0, ge=0)
    coins: int = Field(default=0, ge=0)

    # OAuth providers
    google_id: str | None = None
    vk_id: str | None = None
    facebook_id: str | None = None
    steam_id: str | None = None

    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: datetime | None = None
    is_active: bool = True
    is_verified: bool = False

    class Settings:
        name = "users"
        indexes = [
            "email",
            "username",
            [("google_id", 1)],
            [("vk_id", 1)],
            [("facebook_id", 1)],
            [("steam_id", 1)],
        ]

    def dict(self, *args, **kwargs) -> dict:
        """Override dict to exclude sensitive data."""
        data = super().dict(*args, **kwargs)
        data.pop("hashed_password", None)
        return data
