"""User model with Beanie ODM."""

from datetime import datetime, UTC
from typing import Annotated

from beanie import Document, Indexed
from pydantic import EmailStr, Field


class Position(dict):
    """Position model for start coordinates."""

    def __init__(self, x: float = 0.0, y: float = 0.0):
        super().__init__(x=x, y=y)
        self.x = x
        self.y = y


class User(Document):
    """User document model."""

    # Authentication
    email: Annotated[EmailStr, Indexed(unique=True)]
    username: Annotated[str, Indexed(unique=True)] = Field(min_length=3, max_length=50)
    hashed_password: str

    # Profile
    display_name: str | None = None
    avatar_url: str = Field(default="/static/content/avatars/dog_def.png")

    # Game data
    level: int = Field(default=1, ge=1)
    experience: int = Field(default=0, ge=0)
    coins: int = Field(default=0, ge=0)

    # Game settings
    lang: str = Field(default="en", max_length=10)
    quick: bool = Field(default=False, description="Quick game mode")
    is_tester: bool = Field(default=False, description="Tester flag")
    car_index: int | None = Field(default=None, description="Selected car index")
    ordinal_number: int | None = Field(default=None, description="Player rating number")
    role_class_uri: str = Field(
        default="/registry/rpg_settings/role_class/chosen_one",
        max_length=255
    )

    # Teaching/Tutorial state
    teaching_state: str = Field(
        default="",
        max_length=30,
        description="Teaching state: '' (unknown), 'cancel', 'done', 'map', 'map_start', 'city'"
    )
    start_position: dict = Field(
        default_factory=lambda: {"x": 0.0, "y": 0.0},
        description="Start coordinates"
    )
    registration_status: str = Field(
        default="register",
        max_length=64,
        description="Registration status"
    )

    # OAuth providers
    google_id: str | None = None
    vk_id: str | None = None
    facebook_id: str | None = None
    steam_id: str | None = None
    twitter_id: str | None = None

    # Moderation
    access_level: int = Field(
        default=0,
        description="0 = Player, 1 = Game Master, 2 = Moderator, 10 = Admin"
    )
    ban_time: datetime = Field(
        default_factory=lambda: datetime.now(UTC),
        description="Ban expiration time"
    )
    ban_reason: str = Field(default="", max_length=255)
    silent_time: datetime = Field(
        default_factory=lambda: datetime.now(UTC),
        description="Mute/silent expiration time"
    )

    # Metadata
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    last_login: datetime | None = None
    is_active: bool = True
    is_verified: bool = False

    class Settings:
        name = "users"
        indexes = [
            # Unique indexes for authentication
            "email",
            "username",

            # OAuth provider indexes (sparse for nullable fields)
            [("google_id", 1)],
            [("vk_id", 1)],
            [("facebook_id", 1)],
            [("steam_id", 1)],
            [("twitter_id", 1)],

            # Performance indexes for common queries
            [("is_active", 1)],  # Filter active users
            [("level", -1), ("experience", -1)],  # Leaderboard query
            [("created_at", -1)],  # Recent users
            [("last_login", -1)],  # Active users tracking

            # Moderation indexes
            [("ban_time", 1)],  # Check bans
            [("access_level", 1)],  # Admin queries

            # Compound index for search
            [("username", 1), ("quick", 1)],  # Admin search
        ]

    @property
    def is_banned(self) -> bool:
        """Check if user is currently banned."""
        return datetime.now(UTC) < self.ban_time

    @property
    def is_silenced(self) -> bool:
        """Check if user is currently silenced/muted."""
        return datetime.now(UTC) < self.silent_time

    def get_ban_seconds_remaining(self) -> float:
        """Get remaining ban duration in seconds."""
        if not self.is_banned:
            return 0.0
        return (self.ban_time - datetime.now(UTC)).total_seconds()

    def get_silent_seconds_remaining(self) -> float:
        """Get remaining silent/mute duration in seconds."""
        if not self.is_silenced:
            return 0.0
        return (self.silent_time - datetime.now(UTC)).total_seconds()

    def assign_ordinal_number(self) -> int:
        """Assign ordinal number for player rating."""
        if self.ordinal_number is None:
            # TODO: Implement proper ordinal number assignment
            # Query max ordinal_number and increment
            self.ordinal_number = 12345
        return self.ordinal_number

    def dict(self, *args, **kwargs) -> dict:
        """Override dict to exclude sensitive data."""
        data = super().dict(*args, **kwargs)
        data.pop("hashed_password", None)
        return data
