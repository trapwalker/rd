"""Redis-based rate limiting for distributed systems."""

import logging
import time
from typing import Optional

from fastapi import HTTPException, status

logger = logging.getLogger(__name__)


class RedisRateLimiter:
    """
    Redis-based rate limiter using sliding window algorithm.

    Features:
    - Distributed (works with multiple workers/servers)
    - Persistent (survives server restarts)
    - Configurable per-endpoint
    - Automatic cleanup of old entries
    """

    def __init__(
        self,
        redis_client=None,
        max_calls: int = 5,
        window_seconds: int = 90,
        ban_seconds: int = 20
    ):
        """
        Initialize rate limiter.

        Args:
            redis_client: Redis async client (if None, falls back to in-memory)
            max_calls: Maximum calls allowed in window
            window_seconds: Time window in seconds
            ban_seconds: Ban duration when limit exceeded
        """
        self.redis = redis_client
        self.max_calls = max_calls
        self.window_seconds = window_seconds
        self.ban_seconds = ban_seconds

        # Fallback to in-memory if Redis not available
        if not self.redis:
            logger.warning(
                "RedisRateLimiter initialized without Redis client - "
                "falling back to in-memory (not suitable for production!)"
            )
            self._memory_store: dict[str, list[float]] = {}

    async def check_frequency(
        self,
        user_id: str,
        endpoint: str,
        max_calls: Optional[int] = None,
        window_seconds: Optional[int] = None
    ) -> int:
        """
        Check if request is within rate limit.

        Args:
            user_id: User identifier
            endpoint: Endpoint identifier
            max_calls: Override default max calls
            window_seconds: Override default window

        Returns:
            Current request count in window

        Raises:
            HTTPException(429): If rate limit exceeded
        """
        max_calls = max_calls or self.max_calls
        window = window_seconds or self.window_seconds

        # Check if user is banned
        ban_key = f"banned:{endpoint}:{user_id}"

        if self.redis:
            is_banned = await self.redis.exists(ban_key)
            if is_banned:
                ttl = await self.redis.ttl(ban_key)
                logger.warning(
                    f"Rate limit ban active for {user_id} on {endpoint} "
                    f"(remaining: {ttl}s)"
                )
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded. Try again in {ttl} seconds.",
                    headers={"Retry-After": str(ttl)}
                )
        else:
            # In-memory ban check
            if ban_key in self._memory_store:
                logger.warning(f"Rate limit ban active for {user_id} on {endpoint}")
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded. Try again in {self.ban_seconds} seconds.",
                )

        # Check request count
        if self.redis:
            count = await self._check_redis(user_id, endpoint, max_calls, window)
        else:
            count = await self._check_memory(user_id, endpoint, max_calls, window)

        # If exceeded, ban the user
        if count > max_calls:
            logger.warning(
                f"Rate limit exceeded for {user_id} on {endpoint}: "
                f"{count}/{max_calls} in {window}s"
            )

            if self.redis:
                await self.redis.setex(ban_key, self.ban_seconds, "1")
            else:
                self._memory_store[ban_key] = [time.time()]

            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Banned for {self.ban_seconds} seconds.",
                headers={"Retry-After": str(self.ban_seconds)}
            )

        return count

    async def _check_redis(
        self,
        user_id: str,
        endpoint: str,
        max_calls: int,
        window: int
    ) -> int:
        """Check rate limit using Redis sorted set (sliding window)."""
        key = f"rate_limit:{endpoint}:{user_id}"
        now = time.time()

        # Use pipeline for atomic operations
        pipe = self.redis.pipeline()

        # Remove old entries (outside window)
        pipe.zremrangebyscore(key, 0, now - window)

        # Add current request
        pipe.zadd(key, {str(now): now})

        # Count requests in window
        pipe.zcount(key, now - window, now)

        # Set expiration (cleanup)
        pipe.expire(key, window)

        # Execute pipeline
        results = await pipe.execute()

        # Get count from results (3rd operation)
        count = results[2]

        return count

    async def _check_memory(
        self,
        user_id: str,
        endpoint: str,
        max_calls: int,
        window: int
    ) -> int:
        """Fallback in-memory rate limiting (not distributed!)."""
        key = f"rate_limit:{endpoint}:{user_id}"
        now = time.time()

        # Initialize if not exists
        if key not in self._memory_store:
            self._memory_store[key] = []

        # Remove old entries
        self._memory_store[key] = [
            t for t in self._memory_store[key]
            if now - t < window
        ]

        # Add current request
        self._memory_store[key].append(now)

        # Return count
        return len(self._memory_store[key])

    async def reset(self, user_id: str, endpoint: str) -> None:
        """Reset rate limit for user/endpoint (admin use)."""
        key = f"rate_limit:{endpoint}:{user_id}"
        ban_key = f"banned:{endpoint}:{user_id}"

        if self.redis:
            await self.redis.delete(key, ban_key)
        else:
            self._memory_store.pop(key, None)
            self._memory_store.pop(ban_key, None)

        logger.info(f"Rate limit reset for {user_id} on {endpoint}")


# Global instance (will be initialized in main.py)
_rate_limiter: Optional[RedisRateLimiter] = None


def get_rate_limiter() -> RedisRateLimiter:
    """Get global rate limiter instance."""
    if _rate_limiter is None:
        raise RuntimeError("Rate limiter not initialized")
    return _rate_limiter


def init_rate_limiter(redis_client=None, **kwargs) -> RedisRateLimiter:
    """
    Initialize global rate limiter.

    Args:
        redis_client: Redis async client
        **kwargs: Additional rate limiter config

    Returns:
        Configured rate limiter instance
    """
    global _rate_limiter
    _rate_limiter = RedisRateLimiter(redis_client, **kwargs)
    logger.info("Rate limiter initialized")
    return _rate_limiter
