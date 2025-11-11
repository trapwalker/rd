"""Password reset schemas."""

from pydantic import BaseModel, EmailStr, Field


class PasswordResetRequest(BaseModel):
    """Password reset request schema."""

    email: EmailStr = Field(..., description="User email address")


class PasswordResetConfirm(BaseModel):
    """Password reset confirmation schema."""

    token: str = Field(..., min_length=32, max_length=256, description="Reset token")
    new_password: str = Field(..., min_length=8, max_length=100, description="New password")


class PasswordResetResponse(BaseModel):
    """Password reset response schema."""

    message: str
    email: str | None = None
