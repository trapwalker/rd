"""Utilities for marking deprecated/unused code."""

import functools
import warnings
from typing import Callable, TypeVar

F = TypeVar("F", bound=Callable)


def deprecated(reason: str, replacement: str | None = None) -> Callable[[F], F]:
    """
    Decorator to mark functions/classes as deprecated.

    Args:
        reason: Why this is deprecated
        replacement: What to use instead (optional)

    Example:
        @deprecated("Use new_function instead", replacement="new_function")
        def old_function():
            pass
    """

    def decorator(func: F) -> F:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            message = f"{func.__name__} is deprecated: {reason}"
            if replacement:
                message += f". Use {replacement} instead"

            warnings.warn(message, DeprecationWarning, stacklevel=2)
            return func(*args, **kwargs)

        # Mark the function as deprecated
        wrapper.__deprecated__ = True  # type: ignore
        wrapper.__deprecated_reason__ = reason  # type: ignore
        wrapper.__deprecated_replacement__ = replacement  # type: ignore

        return wrapper  # type: ignore

    return decorator


def unused(reason: str) -> Callable[[F], F]:
    """
    Decorator to mark code as unused but kept for reference.

    Args:
        reason: Why this code is no longer used

    Example:
        @unused("Replaced by FastAPI WebSocket handler")
        class TornadoWSHandler:
            pass
    """

    def decorator(func: F) -> F:
        # Mark the function/class as unused
        func.__unused__ = True  # type: ignore
        func.__unused_reason__ = reason  # type: ignore
        return func

    return decorator


def migration_target(original_class: str) -> Callable[[F], F]:
    """
    Decorator to mark new code as migration target.

    Args:
        original_class: Path to original Tornado class being replaced

    Example:
        @migration_target("sublayers_server.handlers.pages.PlayHandler")
        @router.get("/play")
        async def play_handler():
            pass
    """

    def decorator(func: F) -> F:
        func.__migration_target__ = True  # type: ignore
        func.__replaces__ = original_class  # type: ignore
        return func

    return decorator
