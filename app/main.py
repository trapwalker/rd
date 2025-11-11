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

    # Load game world data
    # await load_world_registry(settings.world_path)

    logger.info("Application startup complete")

    yield

    # Shutdown
    logger.info("Shutting down application")
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

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
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

    # Include routers
    from app.routers import (
        auth,
        game,
        inventory,
        menus,
        pages,
        profile,
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
