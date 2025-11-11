"""Rate limiting utilities for FastAPI."""

import logging
from collections import Counter
from time import time as get_time
from typing import Any

from fastapi import HTTPException, Request, status

logger = logging.getLogger(__name__)


class FrequencyLimiter:
    """
    Frequency-based rate limiter to prevent abuse.

    Tracks request frequency per user and applies delays/blocks
    when too many requests are made in a short time.
    """

    def __init__(
        self,
        delay_to_forget: int = 90,
        max_call_count: int = 7,
        sleep_duration: int = 20
    ):
        """
        Initialize frequency limiter.

        Args:
            delay_to_forget: Seconds after which to reset the counter
            max_call_count: Maximum calls before triggering rate limit
            sleep_duration: How long to block the user (seconds)
        """
        self.delay_to_forget = delay_to_forget
        self.max_call_count = max_call_count
        self.sleep_duration = sleep_duration
        self._frequency_stat: dict[tuple[str, str], Counter] = {}

    def check_frequency(self, user_id: str, endpoint: str) -> int:
        """
        Check if user is calling endpoint too frequently.

        Args:
            user_id: User identifier
            endpoint: Endpoint name

        Returns:
            Seconds to wait (0 if no limit)

        Raises:
            HTTPException: If rate limit is exceeded
        """
        stat = self._frequency_stat.setdefault((endpoint, user_id), Counter())
        current_time = get_time()
        last_time = stat.get("last", 0)
        delta = current_time - last_time

        stat["last"] = current_time

        if delta > self.delay_to_forget:
            # Reset counter after long period
            logger.debug(
                f"Reset frequency counter for user {user_id} on {endpoint}"
            )
            stat["count"] = 1
            stat["sum"] = 0
            return 0

        # Increment counter
        stat["count"] += 1
        stat["sum"] += delta
        count = stat["count"]
        sum_time = stat["sum"]

        if count > self.max_call_count:
            logger.warning(
                f"User {user_id} exceeded rate limit on {endpoint}: "
                f"{count} calls in {sum_time:.1f}s. "
                f"Blocking for {self.sleep_duration}s"
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error": "Rate limit exceeded",
                    "retry_after": self.sleep_duration,
                    "calls": count,
                    "time_window": sum_time,
                }
            )

        logger.debug(
            f"Frequency check for user {user_id} on {endpoint}: "
            f"{count} calls in {sum_time:.1f}s"
        )
        return 0

    def clear_user_stats(self, user_id: str) -> None:
        """Clear frequency statistics for a user."""
        keys_to_delete = [
            key for key in self._frequency_stat
            if key[1] == user_id
        ]
        for key in keys_to_delete:
            del self._frequency_stat[key]


# Global limiter instance
_limiter = FrequencyLimiter()


async def check_play_frequency(
    request: Request,
    user_id: str
) -> None:
    """
    Dependency to check play endpoint frequency.

    Args:
        request: FastAPI request object
        user_id: User identifier

    Raises:
        HTTPException: If rate limit exceeded
    """
    endpoint = request.url.path
    _limiter.check_frequency(user_id, endpoint)


def get_frequency_limiter() -> FrequencyLimiter:
    """Get global frequency limiter instance."""
    return _limiter
