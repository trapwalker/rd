"""Password reset token management."""

import secrets
from datetime import datetime, timedelta, UTC
from typing import Any

from app.config import get_settings


class PasswordResetToken:
    """
    Secure password reset token manager.

    Uses in-memory storage for simplicity.
    In production, use Redis or database with TTL.
    """

    # In-memory token storage: {token: {user_id, email, expires_at}}
    _tokens: dict[str, dict[str, Any]] = {}

    @classmethod
    def create_token(cls, user_id: str, email: str, expires_in: int = 3600) -> str:
        """
        Create password reset token.

        Args:
            user_id: User ID
            email: User email
            expires_in: Token lifetime in seconds (default 1 hour)

        Returns:
            Reset token string
        """
        # Generate cryptographically secure token
        token = secrets.token_urlsafe(32)

        # Store token with expiration
        cls._tokens[token] = {
            "user_id": user_id,
            "email": email,
            "expires_at": datetime.now(UTC) + timedelta(seconds=expires_in),
            "used": False,
        }

        # Clean up expired tokens
        cls._cleanup_expired()

        return token

    @classmethod
    def verify_token(cls, token: str) -> dict[str, Any] | None:
        """
        Verify reset token and return user data.

        Args:
            token: Reset token to verify

        Returns:
            User data dict or None if invalid
        """
        cls._cleanup_expired()

        token_data = cls._tokens.get(token)

        if not token_data:
            return None

        # Check if expired
        if datetime.now(UTC) > token_data["expires_at"]:
            del cls._tokens[token]
            return None

        # Check if already used
        if token_data["used"]:
            return None

        return {
            "user_id": token_data["user_id"],
            "email": token_data["email"],
        }

    @classmethod
    def invalidate_token(cls, token: str) -> None:
        """
        Mark token as used (one-time use).

        Args:
            token: Token to invalidate
        """
        if token in cls._tokens:
            cls._tokens[token]["used"] = True

    @classmethod
    def _cleanup_expired(cls) -> None:
        """Remove expired tokens from storage."""
        now = datetime.now(UTC)
        expired_tokens = [
            token
            for token, data in cls._tokens.items()
            if now > data["expires_at"]
        ]

        for token in expired_tokens:
            del cls._tokens[token]

    @classmethod
    def get_token_info(cls, token: str) -> dict[str, Any] | None:
        """
        Get token information without invalidating it.

        Args:
            token: Token to check

        Returns:
            Token data or None if invalid
        """
        cls._cleanup_expired()
        return cls._tokens.get(token)


async def send_password_reset_email(email: str, token: str) -> None:
    """
    Send password reset email.

    In production, integrate with email service (SendGrid, AWS SES, etc).
    For now, just log the reset link.

    Args:
        email: Recipient email
        token: Reset token
    """
    import logging

    logger = logging.getLogger(__name__)
    settings = get_settings()

    # Build reset URL
    # In production, use actual domain
    reset_url = f"http://localhost:{settings.port}/reset-password?token={token}"

    # TODO: Send actual email
    # For now, log to console
    logger.info(
        f"Password reset requested for {email}\n"
        f"Reset link (valid for 1 hour): {reset_url}\n"
        f"Token: {token}"
    )

    # Example production code:
    # from app.core.email import send_email
    # await send_email(
    #     to=email,
    #     subject="Password Reset Request",
    #     template="password_reset.html",
    #     context={"reset_url": reset_url}
    # )
