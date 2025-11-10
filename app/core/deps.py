"""FastAPI dependencies for authentication and database access."""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.security import decode_access_token
from app.database import Database
from app.models.user import User

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth/login",
    auto_error=False,
)


async def get_db() -> AsyncIOMotorDatabase:
    """Get database instance as dependency."""
    return Database.get_database()


async def get_current_user(
    token: Annotated[str | None, Depends(oauth2_scheme)] = None
) -> User | None:
    """
    Get current user from JWT token.

    Returns None if no token or invalid token (for optional authentication).
    """
    if not token:
        return None

    payload = decode_access_token(token)
    if not payload:
        return None

    user_id: str = payload.get("sub")
    if not user_id:
        return None

    user = await User.get(user_id)
    return user


async def get_current_active_user(
    current_user: Annotated[User | None, Depends(get_current_user)] = None
) -> User:
    """
    Get current active user (required authentication).

    Raises 401 if not authenticated or user inactive.
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )

    return current_user


async def get_current_verified_user(
    current_user: Annotated[User, Depends(get_current_active_user)]
) -> User:
    """
    Get current verified user.

    Raises 403 if user email not verified.
    """
    if not current_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified"
        )

    return current_user


# Type aliases for dependencies
CurrentUser = Annotated[User | None, Depends(get_current_user)]
CurrentActiveUser = Annotated[User, Depends(get_current_active_user)]
CurrentVerifiedUser = Annotated[User, Depends(get_current_verified_user)]
DatabaseDep = Annotated[AsyncIOMotorDatabase, Depends(get_db)]
