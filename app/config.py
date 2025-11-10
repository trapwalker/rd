"""Application configuration using pydantic-settings."""

from functools import lru_cache
from typing import Literal

from pydantic import Field, MongoDsn
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
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
        default="your-secret-key-change-in-production",
        description="Secret key for JWT tokens"
    )
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24 hours

    # CORS
    cors_origins: list[str] = Field(
        default=["http://localhost:3000", "http://localhost:8000"],
        description="Allowed CORS origins"
    )

    # File paths
    static_path: str = "sublayers_common/static"
    world_path: str = "sublayers_world"
    template_path: str = "sublayers_server/templates"

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
