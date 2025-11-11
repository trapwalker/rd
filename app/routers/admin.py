"""Admin API routes (localhost only)."""

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Request, status

from app.config import get_settings
from app.core.deps import ServerStateDep, get_server_state
from app.models.user import User
from app.utils.deprecation import migration_target

logger = logging.getLogger(__name__)

router = APIRouter()
settings = get_settings()


def check_localhost(request: Request) -> None:
    """
    Check if request is from localhost.

    Raises:
        HTTPException: If request is not from localhost
    """
    client_host = request.client.host if request.client else None

    if client_host not in ("127.0.0.1", "localhost", "::1"):
        logger.warning(f"Admin API access denied from {client_host}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin API only accessible from localhost"
        )


@router.post("/server/save")
@migration_target("sublayers_server.handlers.adm_api.srv_control.ServerSaveHandler")
async def server_save(
    request: Request,
) -> dict[str, Any]:
    """
    Trigger server save operation (localhost only).

    Saves current game state to database.

    Returns:
        Save operation result

    Migration from: sublayers_server.handlers.adm_api.srv_control.ServerSaveHandler
    """
    check_localhost(request)

    # TODO: Implement server save
    # result = await server.flash_save()

    logger.info("Server save triggered from localhost")

    return {
        "success": True,
        "message": "Server save completed",
        "timestamp": "2025-01-01T00:00:00Z",  # TODO: Get actual time
    }


@router.post("/server/shutdown")
@migration_target("sublayers_server.handlers.adm_api.srv_control.ServerShutdownHandler")
async def server_shutdown(
    request: Request,
    server_state: ServerStateDep = None,
) -> dict[str, str]:
    """
    Trigger server shutdown (localhost only).

    DANGEROUS: Stops the server gracefully.

    Returns:
        Shutdown confirmation

    Migration from: sublayers_server.handlers.adm_api.srv_control.ServerShutdownHandler
    """
    check_localhost(request)

    # Set server to maintenance mode first
    if server_state:
        server_state.is_closed_for_agents = True
        server_state.maintenance_message = "Server is shutting down"

    # TODO: Implement graceful shutdown
    # - Save all game state
    # - Disconnect all players
    # - Stop application

    logger.critical("Server shutdown triggered from localhost")

    return {
        "success": True,
        "message": "Server shutdown initiated (not actually shutting down in this implementation)"
    }


@router.get("/users/status")
@migration_target("sublayers_server.handlers.adm_api.user_control.UserStatusHandler")
async def user_status_handler(
    request: Request,
    npc: str = "-",
) -> list[dict[str, Any]]:
    """
    Get status of all agents (players/NPCs) (localhost only).

    Args:
        npc: Filter by NPC status
            '-' = all agents
            '0', 'no', 'n' = only players
            '1', 'yes', 'y' = only NPCs

    Returns:
        List of agent information

    Migration from: sublayers_server.handlers.adm_api.user_control.UserStatusHandler
    """
    check_localhost(request)

    # TODO: Get agents from game server
    # agents = [
    #     agent.adm_info
    #     for agent in server.agents_by_name.values()
    #     if (npc == '-') or
    #        (npc in {'0', 'no', 'n'} and agent.user) or
    #        (npc in {'1', 'yes', 'y'} and agent.user is None)
    # ]

    logger.info(f"User status requested with filter npc={npc}")

    # Mock response
    return [
        {
            "agent_id": "agent_1",
            "username": "player1",
            "is_npc": False,
            "online": True,
            "position": {"x": 100.0, "y": 200.0},
        },
        {
            "agent_id": "agent_2",
            "username": "npc_bot",
            "is_npc": True,
            "online": True,
            "position": {"x": 150.0, "y": 250.0},
        },
    ]


@router.post("/users/access-level")
@migration_target("sublayers_server.handlers.adm_api.user_control.UserAccessLevelSetup")
async def user_access_level_setup(
    request: Request,
    username: str,
    access: int,
) -> dict[str, str]:
    """
    Set user access level (localhost only).

    Access levels:
    - 0: Player
    - 1: Game Master
    - 2: Moderator
    - 10: Administrator

    Args:
        username: Username to modify
        access: New access level (0-10)

    Returns:
        Success message

    Migration from: sublayers_server.handlers.adm_api.user_control.UserAccessLevelSetup
    """
    check_localhost(request)

    if not username or access is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bad arguments: username and access required"
        )

    # Ensure access level is non-negative
    access = max(int(access), 0)

    # Find user by username
    user = await User.find_one(User.username == username)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User <{username}> not found"
        )

    # Update access level
    old_access = user.access_level
    user.access_level = access
    await user.save()

    logger.warning(
        f"Access level changed for {username}: {old_access} → {access} "
        f"(from {request.client.host})"
    )

    return {
        "success": True,
        "message": f"Access level for {username} changed to: {access}"
    }


@router.get("/server/status")
async def server_status(
    request: Request,
    server_state: ServerStateDep = None,
) -> dict[str, Any]:
    """
    Get current server status (localhost only).

    Returns server health, player count, and other metrics.

    Args:
        server_state: Server state dependency

    Returns:
        Server status information
    """
    check_localhost(request)

    # TODO: Get real metrics from server
    # - Active players count
    # - Server uptime
    # - Memory usage
    # - Database connections

    return {
        "status": "running",
        "is_maintenance": server_state.is_closed_for_agents if server_state else False,
        "active_players": 0,  # TODO: Get from server
        "active_npcs": 0,  # TODO: Get from server
        "uptime_seconds": 0,  # TODO: Calculate
        "version": settings.app_version,
        "environment": settings.environment,
    }


@router.post("/server/maintenance")
async def set_maintenance_mode(
    request: Request,
    enabled: bool,
    message: str = "Server is under maintenance",
    server_state: ServerStateDep = None,
) -> dict[str, Any]:
    """
    Enable or disable server maintenance mode (localhost only).

    Args:
        enabled: True to enable maintenance mode
        message: Maintenance message to display
        server_state: Server state dependency

    Returns:
        New server state
    """
    check_localhost(request)

    if server_state:
        server_state.is_closed_for_agents = enabled
        server_state.maintenance_message = message

    logger.warning(
        f"Maintenance mode {'enabled' if enabled else 'disabled'}: {message}"
    )

    return {
        "success": True,
        "maintenance_enabled": enabled,
        "message": message,
    }
