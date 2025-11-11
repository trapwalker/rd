"""FastAPI dependencies for authentication and database access."""

import logging
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.security import decode_access_token
from app.database import Database
from app.models.user import User

logger = logging.getLogger(__name__)

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


# Server state (can be moved to config or database later)
class ServerState:
    """Global server state."""

    is_closed_for_agents: bool = False
    maintenance_message: str = "Server is under maintenance"


_server_state = ServerState()


def get_server_state() -> ServerState:
    """Get server state singleton."""
    return _server_state


async def check_user_not_banned(
    current_user: Annotated[User, Depends(get_current_active_user)]
) -> User:
    """
    Check if user is not banned.

    Raises:
        HTTPException: If user is banned
    """
    if current_user.is_banned:
        ban_seconds = current_user.get_ban_seconds_remaining()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "User is banned",
                "reason": current_user.ban_reason or "No reason provided",
                "ban_expires_in_seconds": ban_seconds,
            }
        )

    return current_user


async def check_server_not_closed(
    server_state: Annotated[ServerState, Depends(get_server_state)]
) -> None:
    """
    Check if server is open for connections.

    Raises:
        HTTPException: If server is closed
    """
    if server_state.is_closed_for_agents:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "Server is closed",
                "message": server_state.maintenance_message,
            }
        )


async def get_optional_user_from_cookie(
    request: Request
) -> User | None:
    """
    Get user from cookie (for backward compatibility with old auth).

    Returns None if cookie not found or user not found.
    """
    user_id = request.cookies.get("user")
    if not user_id:
        return None

    try:
        user = await User.get(user_id)
        return user
    except Exception as e:
        logger.debug(f"Failed to get user from cookie: {e}")
        return None


# Type aliases for dependencies
CurrentUser = Annotated[User | None, Depends(get_current_user)]
CurrentActiveUser = Annotated[User, Depends(get_current_active_user)]
CurrentVerifiedUser = Annotated[User, Depends(get_current_verified_user)]
CurrentUnbannedUser = Annotated[User, Depends(check_user_not_banned)]
OptionalCookieUser = Annotated[User | None, Depends(get_optional_user_from_cookie)]
DatabaseDep = Annotated[AsyncIOMotorDatabase, Depends(get_db)]
ServerStateDep = Annotated[ServerState, Depends(get_server_state)]
