"""Input validation utilities for enhanced security."""

import re
from typing import Any

from fastapi import HTTPException, status

# ==================== Validation Patterns ====================

# Username: 3-20 alphanumeric + underscore/dash
USERNAME_PATTERN = re.compile(r'^[a-zA-Z0-9_-]{3,20}$')

# Email: Basic email validation
EMAIL_PATTERN = re.compile(
    r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
)

# Safe search: Alphanumeric + basic symbols
SAFE_SEARCH_PATTERN = re.compile(r'^[a-zA-Z0-9_\-\.@\s]{1,100}$')

# Item ID: Alphanumeric + underscore
ITEM_ID_PATTERN = re.compile(r'^[a-zA-Z0-9_]{1,50}$')

# Container ID: UUID format
CONTAINER_ID_PATTERN = re.compile(
    r'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
)

# Coordinates: Float numbers
COORDINATE_PATTERN = re.compile(r'^-?\d+\.?\d*$')


# ==================== Validation Functions ====================


def validate_username(username: str) -> str:
    """
    Validate username format.

    Args:
        username: Username to validate

    Returns:
        Validated username

    Raises:
        HTTPException: If username is invalid
    """
    if not username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username is required"
        )

    if not USERNAME_PATTERN.match(username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username must be 3-20 characters (letters, numbers, _, -)"
        )

    return username.strip()


def validate_email(email: str) -> str:
    """
    Validate email format.

    Args:
        email: Email to validate

    Returns:
        Validated email (lowercase)

    Raises:
        HTTPException: If email is invalid
    """
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is required"
        )

    email = email.strip().lower()

    if not EMAIL_PATTERN.match(email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format"
        )

    if len(email) > 255:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email too long (max 255 characters)"
        )

    return email


def validate_password(password: str) -> None:
    """
    Validate password strength.

    Args:
        password: Password to validate

    Raises:
        HTTPException: If password is too weak
    """
    if not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is required"
        )

    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters"
        )

    if len(password) > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password too long (max 100 characters)"
        )

    # Check for basic complexity
    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)

    if not (has_upper and has_lower and has_digit):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain uppercase, lowercase, and digit"
        )


def validate_item_id(item_id: str) -> str:
    """
    Validate item ID format.

    Args:
        item_id: Item ID to validate

    Returns:
        Validated item ID

    Raises:
        HTTPException: If item ID is invalid
    """
    if not item_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Item ID is required"
        )

    if not ITEM_ID_PATTERN.match(item_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid item ID format (use letters, numbers, _)"
        )

    return item_id


def validate_container_id(container_id: str) -> str:
    """
    Validate container ID format (UUID).

    Args:
        container_id: Container ID to validate

    Returns:
        Validated container ID

    Raises:
        HTTPException: If container ID is invalid
    """
    if not container_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Container ID is required"
        )

    container_id = container_id.lower().strip()

    if not CONTAINER_ID_PATTERN.match(container_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid container ID format (must be UUID)"
        )

    return container_id


def validate_quantity(quantity: int, min_val: int = 1, max_val: int = 1000) -> int:
    """
    Validate quantity value.

    Args:
        quantity: Quantity to validate
        min_val: Minimum allowed value
        max_val: Maximum allowed value

    Returns:
        Validated quantity

    Raises:
        HTTPException: If quantity is out of range
    """
    if not isinstance(quantity, int):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quantity must be an integer"
        )

    if quantity < min_val:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Quantity must be at least {min_val}"
        )

    if quantity > max_val:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Quantity cannot exceed {max_val}"
        )

    return quantity


def validate_coordinates(x: float, y: float, max_coord: float = 10000.0) -> tuple[float, float]:
    """
    Validate game coordinates.

    Args:
        x: X coordinate
        y: Y coordinate
        max_coord: Maximum coordinate value

    Returns:
        Validated (x, y) tuple

    Raises:
        HTTPException: If coordinates are invalid
    """
    try:
        x = float(x)
        y = float(y)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Coordinates must be numbers"
        )

    if abs(x) > max_coord or abs(y) > max_coord:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Coordinates out of bounds (max ±{max_coord})"
        )

    return x, y


def validate_search_query(query: str) -> str:
    """
    Validate search query for NoSQL injection prevention.

    Args:
        query: Search query to validate

    Returns:
        Validated query

    Raises:
        HTTPException: If query is invalid
    """
    if not query:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Search query is required"
        )

    query = query.strip()

    if len(query) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Search query too short (min 2 characters)"
        )

    if len(query) > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Search query too long (max 100 characters)"
        )

    if not SAFE_SEARCH_PATTERN.match(query):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid characters in search query"
        )

    return query


def sanitize_regex_input(text: str) -> str:
    """
    Sanitize text for use in regex to prevent ReDoS.

    Args:
        text: Text to sanitize

    Returns:
        Escaped text safe for regex
    """
    return re.escape(text)


def validate_pagination(
    skip: int = 0,
    limit: int = 100,
    max_limit: int = 1000
) -> tuple[int, int]:
    """
    Validate pagination parameters.

    Args:
        skip: Number of items to skip
        limit: Number of items to return
        max_limit: Maximum allowed limit

    Returns:
        Validated (skip, limit) tuple

    Raises:
        HTTPException: If parameters are invalid
    """
    if skip < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Skip must be non-negative"
        )

    if limit < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Limit must be at least 1"
        )

    if limit > max_limit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Limit cannot exceed {max_limit}"
        )

    return skip, limit


def validate_level(level: int) -> int:
    """
    Validate player level.

    Args:
        level: Level to validate

    Returns:
        Validated level

    Raises:
        HTTPException: If level is invalid
    """
    if not isinstance(level, int):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Level must be an integer"
        )

    if level < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Level must be at least 1"
        )

    if level > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Level cannot exceed 100"
        )

    return level


def validate_access_level(level: int) -> int:
    """
    Validate admin access level.

    Args:
        level: Access level to validate

    Returns:
        Validated access level (capped at 0-10)
    """
    if not isinstance(level, int):
        level = 0

    # Cap at 0-10 for security
    return max(0, min(level, 10))


def validate_json_size(data: dict[str, Any], max_size_kb: int = 100) -> dict[str, Any]:
    """
    Validate JSON payload size.

    Args:
        data: JSON data to validate
        max_size_kb: Maximum size in KB

    Returns:
        Validated data

    Raises:
        HTTPException: If data is too large
    """
    import json

    data_size = len(json.dumps(data).encode('utf-8'))
    max_size_bytes = max_size_kb * 1024

    if data_size > max_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Payload too large (max {max_size_kb}KB)"
        )

    return data
