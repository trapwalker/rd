"""Custom exceptions and error handlers for the application."""

import logging
from typing import Any

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import ValidationError

logger = logging.getLogger(__name__)


# ==================== Custom Exceptions ====================


class GameException(Exception):
    """Base exception for game-related errors."""

    def __init__(self, message: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class ItemNotFoundException(GameException):
    """Raised when an item is not found."""

    def __init__(self, item_id: str):
        super().__init__(
            f"Item '{item_id}' not found",
            status_code=status.HTTP_404_NOT_FOUND
        )


class InsufficientResourcesException(GameException):
    """Raised when player doesn't have enough resources."""

    def __init__(self, resource: str, required: int, available: int):
        super().__init__(
            f"Insufficient {resource}: required {required}, available {available}",
            status_code=status.HTTP_400_BAD_REQUEST
        )


class InvalidGameStateException(GameException):
    """Raised when game state is invalid for the operation."""

    def __init__(self, message: str):
        super().__init__(message, status_code=status.HTTP_409_CONFLICT)


class DatabaseException(Exception):
    """Raised when database operation fails."""

    def __init__(self, message: str, original_error: Exception | None = None):
        self.message = message
        self.original_error = original_error
        super().__init__(self.message)


class RateLimitException(HTTPException):
    """Raised when rate limit is exceeded."""

    def __init__(self, retry_after: int):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)}
        )


# ==================== Error Response Models ====================


def error_response(
    message: str,
    status_code: int = status.HTTP_400_BAD_REQUEST,
    details: dict[str, Any] | None = None
) -> JSONResponse:
    """
    Create standardized error response.

    Args:
        message: Error message
        status_code: HTTP status code
        details: Additional error details

    Returns:
        JSONResponse with error information
    """
    content = {
        "error": True,
        "message": message,
        "status_code": status_code,
    }

    if details:
        content["details"] = details

    return JSONResponse(
        status_code=status_code,
        content=content
    )


# ==================== Exception Handlers ====================


async def game_exception_handler(request: Request, exc: GameException) -> JSONResponse:
    """Handle game-specific exceptions."""
    logger.warning(f"Game exception: {exc.message} | Path: {request.url.path}")

    return error_response(
        message=exc.message,
        status_code=exc.status_code
    )


async def database_exception_handler(request: Request, exc: DatabaseException) -> JSONResponse:
    """Handle database exceptions."""
    logger.error(
        f"Database error: {exc.message} | Path: {request.url.path} | "
        f"Original: {exc.original_error}"
    )

    # Don't expose internal database errors to users
    return error_response(
        message="An error occurred while processing your request. Please try again.",
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
    )


async def validation_exception_handler(request: Request, exc: ValidationError) -> JSONResponse:
    """Handle Pydantic validation errors."""
    logger.warning(f"Validation error: {exc.errors()} | Path: {request.url.path}")

    # Format validation errors for user
    errors = []
    for error in exc.errors():
        field = " -> ".join(str(loc) for loc in error["loc"])
        errors.append({
            "field": field,
            "message": error["msg"],
            "type": error["type"]
        })

    return error_response(
        message="Validation error",
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        details={"errors": errors}
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Handle FastAPI HTTP exceptions."""
    logger.warning(
        f"HTTP exception: {exc.status_code} | {exc.detail} | Path: {request.url.path}"
    )

    return error_response(
        message=str(exc.detail),
        status_code=exc.status_code
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected exceptions."""
    logger.error(
        f"Unexpected error: {type(exc).__name__}: {str(exc)} | Path: {request.url.path}",
        exc_info=True
    )

    # Don't expose internal errors to users in production
    return error_response(
        message="An unexpected error occurred. Please try again later.",
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
    )


# ==================== Safe Async Operations ====================


async def safe_get_user(user_id: str) -> Any:
    """
    Safely get user by ID with proper error handling.

    Args:
        user_id: User ID to fetch

    Returns:
        User object

    Raises:
        HTTPException: If user not found or database error
    """
    from app.models.user import User

    try:
        user = await User.get(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User not found"
            )
        return user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user {user_id}: {e}")
        raise DatabaseException("Failed to fetch user", original_error=e)


async def safe_database_operation(operation, *args, **kwargs) -> Any:
    """
    Wrap database operation with error handling.

    Args:
        operation: Async function to execute
        *args, **kwargs: Arguments for the operation

    Returns:
        Operation result

    Raises:
        DatabaseException: If operation fails
    """
    try:
        return await operation(*args, **kwargs)
    except Exception as e:
        logger.error(f"Database operation failed: {type(e).__name__}: {str(e)}")
        raise DatabaseException(
            "Database operation failed",
            original_error=e
        )
