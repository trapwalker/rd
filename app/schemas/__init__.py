"""Pydantic schemas for API request/response validation."""

from app.schemas.auth import (
    Token,
    TokenPayload,
    UserLogin,
    UserRegister,
)
from app.schemas.profile import (
    CarInfoSchema,
    ProfileInfoSchema,
    QuickGameCar,
    QuickGameCarsResponse,
    SkillsSchema,
    UserProfileResponse,
)
from app.schemas.user import (
    UserCreate,
    UserRead,
    UserUpdate,
)

__all__ = [
    # Auth
    "Token",
    "TokenPayload",
    "UserLogin",
    "UserRegister",
    # User
    "UserCreate",
    "UserRead",
    "UserUpdate",
    # Profile
    "SkillsSchema",
    "CarInfoSchema",
    "ProfileInfoSchema",
    "UserProfileResponse",
    "QuickGameCar",
    "QuickGameCarsResponse",
]
