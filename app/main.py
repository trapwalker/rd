"""
FastAPI Application Entry Point

Modern async web server for RoadDogs game.
"""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.database import Database

# Import routers (will create these)
# from app.routers import auth, game, api

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan events.

    Handles startup and shutdown procedures.
    """
    settings = get_settings()

    # Startup
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    logger.info(f"Environment: {settings.environment}")

    # Connect to database
    await Database.connect(settings)

    # Initialize rate limiter
    redis_client = None
    if settings.redis_url:
        try:
            import redis.asyncio as aioredis
            redis_client = await aioredis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True
            )
            # Test connection
            await redis_client.ping()
            logger.info("Redis connected for rate limiting")
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}. Using in-memory rate limiting")
            redis_client = None

    from app.core.redis_rate_limiter import init_rate_limiter
    init_rate_limiter(
        redis_client=redis_client,
        max_calls=5,
        window_seconds=90,
        ban_seconds=20
    )

    # Load game world data
    # await load_world_registry(settings.world_path)

    logger.info("Application startup complete")

    yield

    # Shutdown
    logger.info("Shutting down application")

    # Close Redis connection
    if redis_client:
        await redis_client.close()
        logger.info("Redis connection closed")

    await Database.disconnect()
    logger.info("Application shutdown complete")


def create_app() -> FastAPI:
    """Create and configure FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        docs_url="/docs" if settings.debug else None,
        redoc_url="/redoc" if settings.debug else None,
        default_response_class=ORJSONResponse,
        lifespan=lifespan,
    )

    # Register exception handlers
    from pydantic import ValidationError
    from fastapi import HTTPException
    from app.core.exceptions import (
        DatabaseException,
        GameException,
        database_exception_handler,
        game_exception_handler,
        generic_exception_handler,
        http_exception_handler,
        validation_exception_handler,
    )

    app.add_exception_handler(GameException, game_exception_handler)
    app.add_exception_handler(DatabaseException, database_exception_handler)
    app.add_exception_handler(ValidationError, validation_exception_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)

    # CORS middleware with security restrictions
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=settings.environment != "production",  # Only in dev
        allow_methods=["GET", "POST", "PUT", "DELETE"],  # Explicit whitelist
        allow_headers=["content-type", "authorization", "accept", "accept-language"],
        max_age=3600,  # Cache preflight for 1 hour
    )

    # Mount static files
    try:
        app.mount(
            "/static",
            StaticFiles(directory=settings.static_path),
            name="static",
        )
    except RuntimeError:
        logger.warning(f"Static directory not found: {settings.static_path}")

    # Mount map tiles (same convention as the legacy nginx config: /map -> sublayers_world/tiles/map).
    # In production this path is normally served directly by nginx; mounting it here too means
    # `uvicorn app.main:app` alone (no nginx in front) still serves tiles correctly in dev.
    try:
        app.mount(
            "/map",
            StaticFiles(directory=f"{settings.world_path}/tiles/map"),
            name="map",
        )
    except RuntimeError:
        logger.warning(f"Map tiles directory not found: {settings.world_path}/tiles/map")

    # Include routers
    from app.routers import (
        admin,
        admin_ui,
        auth,
        game,
        inventory,
        menus,
        mobile,
        pages,
        person_info,
        profile,
        statistics,
        teaching,
        users,
        websocket,
    )

    app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
    app.include_router(users.router, prefix="/api/users", tags=["Users"])
    app.include_router(game.router, prefix="/api/game", tags=["Game"])
    app.include_router(websocket.router, tags=["WebSocket"])
    app.include_router(pages.router, tags=["Pages"])
    app.include_router(inventory.router, prefix="/api/inventory", tags=["Inventory"])
    app.include_router(profile.router, prefix="/api/profile", tags=["Profile"])
    app.include_router(menus.router, tags=["Menus"])
    app.include_router(teaching.router, prefix="/api/teaching", tags=["Teaching"])
    app.include_router(person_info.router, tags=["PersonInfo"])
    app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
    app.include_router(admin_ui.router, tags=["AdminUI"])
    app.include_router(statistics.router, prefix="/statistics", tags=["Statistics"])
    app.include_router(mobile.router, tags=["Mobile"])

    # Health check endpoint
    @app.get("/health")
    async def health_check():
        """Health check endpoint."""
        return {
            "status": "healthy",
            "version": settings.app_version,
            "environment": settings.environment,
        }

    # Root redirect
    @app.get("/")
    async def root():
        """Root endpoint with API info."""
        return {
            "name": settings.app_name,
            "version": settings.app_version,
            "docs": "/docs" if settings.debug else "disabled",
        }

    return app


# Create application instance
app = create_app()


if __name__ == "__main__":
    import uvicorn

    settings = get_settings()

    # Configure logging
    logging.basicConfig(
        level=getattr(logging, settings.log_level),
        format=settings.log_format,
    )

    # Run server
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.reload,
        log_level=settings.log_level.lower(),
    )
