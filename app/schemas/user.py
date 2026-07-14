"""User schemas."""

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, BeforeValidator, EmailStr, Field


class UserBase(BaseModel):
    """Base user schema."""

    email: EmailStr
    username: str = Field(min_length=3, max_length=50)
    display_name: str | None = None


class UserCreate(UserBase):
    """User creation schema."""

    password: str = Field(min_length=6)


class UserUpdate(BaseModel):
    """User update schema."""

    display_name: str | None = Field(default=None, min_length=1, max_length=100)
    avatar_url: str | None = None


class UserRead(UserBase):
    """User read schema (public info)."""

    # Beanie возвращает PydanticObjectId — приводим к строке при валидации
    id: Annotated[str, BeforeValidator(str)]
    level: int
    experience: int
    coins: int
    avatar_url: str | None = None
    created_at: datetime
    last_login: datetime | None = None
    is_active: bool
    is_verified: bool

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "507f1f77bcf86cd799439011",
                "email": "player@example.com",
                "username": "player123",
                "display_name": "Cool Player",
                "level": 15,
                "experience": 5420,
                "coins": 1000,
                "avatar_url": "https://example.com/avatar.png",
                "created_at": "2024-01-01T00:00:00Z",
                "last_login": "2024-01-15T12:00:00Z",
                "is_active": True,
                "is_verified": True
            }
        }
