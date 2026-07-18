"""Application configuration using pydantic-settings."""

import secrets
from functools import lru_cache
from typing import Literal

from pydantic import Field, MongoDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        # .env is shared with docker-compose (GAME_ENGINE_HOST, SITE_PORT,
        # NGINX_HTTP_PORT, ...) for the legacy Tornado stack's own variable
        # substitution - those aren't Settings fields, so pydantic-settings'
        # default "forbid" would reject the whole file over vars this model
        # was never meant to read.
        extra="ignore",
    )

    # Application
    app_name: str = "RoadDogs Game Server"
    app_version: str = "0.3.0"
    debug: bool = False
    environment: Literal["development", "staging", "production"] = "development"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    workers: int = 1
    reload: bool = False

    # Database
    mongodb_url: MongoDsn = Field(
        default="mongodb://localhost:27017/rd",
        description="MongoDB connection URL"
    )
    database_name: str = "rd"

    # Redis (for caching, sessions)
    redis_url: str | None = Field(default=None, description="Redis connection URL")

    # Authentication
    secret_key: str = Field(
        default_factory=lambda: secrets.token_urlsafe(32),
        description="Secret key for JWT tokens (auto-generated if not set)"
    )
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24 hours

    @field_validator('secret_key')
    @classmethod
    def validate_secret_key(cls, v: str, info) -> str:
        """Validate secret key security."""
        # Check if using default insecure key
        if v == "your-secret-key-change-in-production":
            raise ValueError(
                "SECURITY ERROR: Default secret key is not allowed! "
                "Set SECRET_KEY environment variable or remove from .env"
            )

        # Require strong key in production
        if hasattr(info, 'data') and info.data.get('environment') == 'production':
            if len(v) < 32:
                raise ValueError(
                    "SECURITY ERROR: SECRET_KEY must be at least 32 characters in production"
                )

        return v

    # CORS
    cors_origins: list[str] = Field(
        default=["http://localhost:3000", "http://localhost:8000"],
        description="Allowed CORS origins"
    )

    @field_validator('cors_origins')
    @classmethod
    def validate_cors_origins(cls, v: list[str], info) -> list[str]:
        """Validate CORS origins for security."""
        # Check for wildcard in production
        if hasattr(info, 'data') and info.data.get('environment') == 'production':
            if "*" in v:
                raise ValueError(
                    "SECURITY ERROR: Wildcard CORS (*) not allowed in production!"
                )

            # Require HTTPS in production
            for origin in v:
                if not origin.startswith("https://"):
                    raise ValueError(
                        f"SECURITY ERROR: Only HTTPS origins allowed in production: {origin}"
                    )

        return v

    # File paths
    static_path: str = "sublayers_common/static"
    world_path: str = "sublayers_world"

    # Game server
    service_name: str = "sl"
    mode: Literal["basic", "quick"] = "basic"
    disconnect_timeout: int = 60
    zones_disable: bool = False
    server_stat_log_interval: int = 10
    statistic_path: str = "sublayers_common/static/stat/"

    # Logging
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    log_format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    @property
    def mongodb_uri(self) -> str:
        """Get MongoDB URI as string."""
        return str(self.mongodb_url)


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
