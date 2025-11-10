"""Authentication schemas."""

from pydantic import BaseModel, EmailStr, Field


class Token(BaseModel):
    """JWT token response."""

    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    """JWT token payload."""

    sub: str  # Subject (user ID)
    exp: int  # Expiration timestamp
    iat: int  # Issued at timestamp


class UserLogin(BaseModel):
    """User login request."""

    email: EmailStr
    password: str = Field(min_length=6)


class UserRegister(BaseModel):
    """User registration request."""

    email: EmailStr
    username: str = Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_-]+$")
    password: str = Field(min_length=6)
    display_name: str | None = None

    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "username": "player123",
                "password": "secretpass",
                "display_name": "Cool Player"
            }
        }
