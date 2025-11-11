"""Security utilities for authentication and authorization."""

from datetime import datetime, timedelta, UTC
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import get_settings

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password for storing."""
    return pwd_context.hash(password)


def create_access_token(
    subject: str | Any,
    expires_delta: timedelta | None = None,
    user_data: dict[str, Any] | None = None
) -> str:
    """
    Create JWT access token with enhanced security fields.

    Args:
        subject: Token subject (usually user ID)
        expires_delta: Token expiration time
        user_data: Additional user data (email, username, access_level)

    Returns:
        Encoded JWT token

    Security enhancements:
        - jti: Unique token ID for revocation tracking
        - nbf: Not valid before time
        - iat: Issued at time
        - iss: Issuer identification
        - aud: Intended audience
        - User metadata: email, username, access_level
    """
    import uuid
    settings = get_settings()

    now = datetime.now(UTC)

    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(
            minutes=settings.access_token_expire_minutes
        )

    to_encode = {
        # Standard JWT claims
        "sub": str(subject),  # Subject (user ID)
        "exp": expire,  # Expiration time
        "iat": now,  # Issued at
        "nbf": now,  # Not before (valid from now)
        "jti": str(uuid.uuid4()),  # JWT ID for revocation tracking
        "iss": settings.app_name,  # Issuer
        "aud": "roaddogs:api",  # Audience

        # Security metadata
        "token_type": "access",
        "environment": settings.environment,
    }

    # Add user metadata if provided
    if user_data:
        to_encode.update({
            "email": user_data.get("email"),
            "username": user_data.get("username"),
            "access_level": user_data.get("access_level", 0),
            "is_active": user_data.get("is_active", True),
        })

    encoded_jwt = jwt.encode(
        to_encode,
        settings.secret_key,
        algorithm=settings.algorithm
    )

    return encoded_jwt


def decode_access_token(token: str) -> dict[str, Any] | None:
    """
    Decode and verify JWT token with enhanced validation.

    Args:
        token: JWT token string

    Returns:
        Token payload or None if invalid

    Validates:
        - Signature
        - Expiration
        - Not before time
        - Issuer
        - Audience
        - Token type
    """
    settings = get_settings()

    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm],
            # Validate standard claims
            options={
                "verify_exp": True,  # Verify expiration
                "verify_nbf": True,  # Verify not before
                "verify_iat": True,  # Verify issued at
                "verify_aud": True,  # Verify audience
                "verify_iss": True,  # Verify issuer
            },
            audience="roaddogs:api",
            issuer=settings.app_name,
        )

        # Additional validation
        if payload.get("token_type") != "access":
            return None

        return payload

    except JWTError:
        return None
