"""Admin UI routes for user and agent management (requires admin access)."""

import logging
import re
from datetime import datetime, timedelta
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from app.core.deps import CurrentActiveUser
from app.models.user import User
from app.utils.deprecation import migration_target

logger = logging.getLogger(__name__)

router = APIRouter()

LOGIN_RE = re.compile(r'^[a-zA-Z_][a-zA-Z0-9_-]{2,19}$')

# Initialize Jinja2 templates
try:
    templates = Jinja2Templates(directory="templates")
except Exception as e:
    logger.warning(f"Templates directory not found: {e}")
    templates = None


def check_admin_access(current_user: CurrentActiveUser, required_level: int = 1) -> User:
    """
    Check if user has required admin access level.

    Args:
        current_user: Current authenticated user
        required_level: Minimum required access level (default 1)

    Raises:
        HTTPException: If user lacks required access

    Returns:
        The current user if access is granted
    """
    if current_user.access_level < required_level:
        logger.warning(
            f"Admin access denied for {current_user.username}: "
            f"level {current_user.access_level} < {required_level}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient access level"
        )
    return current_user


async def get_user_by_username(username: str) -> User | None:
    """Get user by username."""
    if not username or not LOGIN_RE.match(username):
        return None

    # TODO: Also check online agents
    # online_agent = server.agents_by_name.get(username)
    # if online_agent and online_agent.user:
    #     return online_agent.user

    return await User.find_one(User.username == username)


@router.get("/adm/main", response_class=HTMLResponse)
@migration_target("sublayers_server.handlers.adm_api.html_adms_base.AdmMain")
async def adm_main_handler(
    request: Request,
    current_user: CurrentActiveUser = None,
) -> HTMLResponse:
    """
    Admin main dashboard (requires access level 1+).

    Returns:
        HTML response with admin main page

    Migration from: sublayers_server.handlers.adm_api.html_adms_base.AdmMain
    """
    check_admin_access(current_user, required_level=1)

    if not templates:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Templates not configured"
        )

    logger.info(f"Admin dashboard accessed by {current_user.username}")

    return templates.TemplateResponse(
        "adm/main.html",
        {
            "request": request,
            "current_user": current_user,
        }
    )


@router.post("/adm/main")
@migration_target("sublayers_server.handlers.adm_api.html_adms_base.AdmMain")
async def adm_main_action(
    request: Request,
    action: str,
    minutes: int = 0,
    current_user: CurrentActiveUser = None,
) -> dict[str, str]:
    """
    Admin main actions (requires access level 1+).

    Actions:
    - server_block: Block new connections for N minutes

    Args:
        action: Action to perform
        minutes: Duration in minutes (for server_block)

    Returns:
        Action result

    Migration from: sublayers_server.handlers.adm_api.html_adms_base.AdmMain
    """
    check_admin_access(current_user, required_level=1)

    if action == "server_block":
        # TODO: Implement server blocking
        # server.block_connects(seconds=minutes * 60)
        logger.warning(
            f"Server blocked for {minutes} minutes by {current_user.username}"
        )
        return {"status": "Server blocked"}

    return {"status": "OK"}


@router.get("/adm/find", response_class=HTMLResponse)
@migration_target("sublayers_server.handlers.adm_api.html_adms_base.AdmFindUsers")
async def adm_find_users_handler(
    request: Request,
    find: str = "",
    online: str = "",
    regexp: str = "",
    current_user: CurrentActiveUser = None,
) -> HTMLResponse:
    """
    Find users by username or email (requires access level 1+).

    Args:
        find: Search string
        online: Filter to only online users
        regexp: Use regex search

    Returns:
        HTML response with search results

    Migration from: sublayers_server.handlers.adm_api.html_adms_base.AdmFindUsers
    """
    check_admin_access(current_user, required_level=1)

    if not templates:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Templates not configured"
        )

    users = []

    if online:
        # TODO: Get online users from server
        # users = [agent.user for agent in server.agents_by_name.values()
        #          if agent.user and agent.connection]
        pass
    elif regexp and len(find) >= 3:
        # Regex search across multiple fields
        # TODO: Implement regex search when needed
        # For now, simple username search
        users = await User.find(
            User.username.regex(f".*{find}.*", "i"),
            User.is_quick == False
        ).limit(50).to_list()
    elif find and LOGIN_RE.match(find):
        # Simple username contains search
        users = await User.find(
            User.username.regex(f".*{find}.*", "i"),
            User.is_quick == False
        ).limit(50).to_list()

    logger.info(
        f"Admin user search by {current_user.username}: '{find}' "
        f"(found {len(users)} users)"
    )

    return templates.TemplateResponse(
        "adm/find.html",
        {
            "request": request,
            "users": users,
            "find": find,
            "current_user": current_user,
        }
    )


@router.get("/adm/user", response_class=HTMLResponse)
@migration_target("sublayers_server.handlers.adm_api.html_adms_agents.AdmUserInfoHandler")
async def adm_user_info_handler(
    request: Request,
    username: str,
    current_user: CurrentActiveUser = None,
) -> HTMLResponse:
    """
    Display user info and moderation controls (requires access level 1+).

    Args:
        username: Username to display

    Returns:
        HTML response with user info

    Migration from: sublayers_server.handlers.adm_api.html_adms_agents.AdmUserInfoHandler
    """
    check_admin_access(current_user, required_level=1)

    if not templates:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Templates not configured"
        )

    user = await get_user_by_username(username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {username} not found"
        )

    logger.info(f"Admin {current_user.username} viewing user {username}")

    return templates.TemplateResponse(
        "adm/user.html",
        {
            "request": request,
            "user": user,
            "current_user": current_user,
        }
    )


@router.post("/adm/user")
@migration_target("sublayers_server.handlers.adm_api.html_adms_agents.AdmUserInfoHandler")
async def adm_user_action(
    request: Request,
    username: str,
    action: str,
    minutes: int = 0,
    reason: str = "",
    new_level: int = 0,
    current_user: CurrentActiveUser = None,
) -> dict[str, str]:
    """
    Perform user moderation actions (requires access level 1+).

    Actions:
    - ban: Ban user for N minutes (or unban if minutes < 0)
    - silent: Silence user for N minutes (or unsilence if minutes = 0)
    - access_level: Change user access level
    - authorize: Authorize as this user (requires level 5+)

    Args:
        username: Target username
        action: Action to perform
        minutes: Duration (for ban/silent)
        reason: Ban reason
        new_level: New access level (for access_level action)

    Returns:
        Action result

    Migration from: sublayers_server.handlers.adm_api.html_adms_agents.AdmUserInfoHandler
    """
    check_admin_access(current_user, required_level=1)

    user = await get_user_by_username(username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {username} not found"
        )

    # Ban action
    if action == "ban":
        if current_user.access_level < user.access_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your access level < target user access level"
            )

        if minutes > 0:
            user.ban_time = datetime.now() + timedelta(minutes=minutes)
            user.ban_reason = reason
            await user.save()

            # TODO: Disconnect user
            # server.disconnect_agent_by_name(user.username)

            logger.warning(
                f"User {user.username} banned by {current_user.username} "
                f"until {user.ban_time}: {reason}"
            )
            return {"status": f"{user.username} banned until {user.ban_time}"}

        elif minutes < 0:
            user.ban_reason = ""
            user.ban_time = datetime.fromtimestamp(0)
            await user.save()

            logger.warning(f"User {user.username} unbanned by {current_user.username}")
            return {"status": f"{user.username} unbanned"}

    # Silent action
    elif action == "silent":
        if current_user.access_level < user.access_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your access level < target user access level"
            )

        if minutes > 0:
            user.silent_time = datetime.now() + timedelta(minutes=minutes)
            await user.save()

            # TODO: Reload user if online
            # if user_online(username=user.username):
            #     reload_user_settings()

            logger.warning(
                f"User {user.username} silenced by {current_user.username} "
                f"until {user.silent_time}"
            )
            return {"status": f"{user.username} silent until {user.silent_time}"}

        else:
            user.silent_time = datetime.fromtimestamp(0)
            await user.save()

            logger.warning(f"User {user.username} unsilenced by {current_user.username}")
            return {"status": f"{user.username} silent off"}

    # Access level change
    elif action == "access_level":
        # TODO: Check if user is online
        # if user_online(username=user.username):
        #     raise HTTPException(status_code=503, detail="Agent is online")

        if current_user.access_level <= user.access_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your access level <= target user access level"
            )

        new_level = max(int(new_level), 0)
        if new_level >= current_user.access_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You can only set level < {current_user.access_level}"
            )

        old_level = user.access_level
        user.access_level = new_level
        await user.save()

        logger.warning(
            f"Access level for {user.username} changed by {current_user.username}: "
            f"{old_level} → {new_level}"
        )
        return {"status": f"Access level for {user.username} changed to {new_level}"}

    # Authorize as user
    elif action == "authorize":
        if current_user.access_level < 5 or current_user.access_level <= user.access_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your access level <= target or < 5"
            )

        # TODO: Check if user is online
        # if user_online(username=user.username):
        #     raise HTTPException(status_code=503, detail="Agent is online")

        logger.critical(
            f"ADMIN AUTHORIZATION: {current_user.username} authorized as {user.username}"
        )

        # TODO: Set secure cookie
        # response.set_cookie("user", str(user.id), secure=True)

        return {"status": f"You are now authorized as {username}"}

    return {"status": "OK"}


@router.get("/adm/agent", response_class=HTMLResponse)
@migration_target("sublayers_server.handlers.adm_api.html_adms_agents.AdmAgentInfoHandler")
async def adm_agent_info_handler(
    request: Request,
    username: str,
    current_user: CurrentActiveUser = None,
) -> HTMLResponse:
    """
    Display agent (character) info and controls (requires access level 1+).

    Args:
        username: Username to display agent for

    Returns:
        HTML response with agent info

    Migration from: sublayers_server.handlers.adm_api.html_adms_agents.AdmAgentInfoHandler
    """
    check_admin_access(current_user, required_level=1)

    if not templates:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Templates not configured"
        )

    user = await get_user_by_username(username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {username} not found"
        )

    # TODO: Get agent from server or database
    # agent = get_agent_for_user(user)
    agent = None

    logger.info(f"Admin {current_user.username} viewing agent for {username}")

    return templates.TemplateResponse(
        "adm/agent.html",
        {
            "request": request,
            "user": user,
            "agent": agent,
            "current_user": current_user,
        }
    )


@router.post("/adm/agent")
@migration_target("sublayers_server.handlers.adm_api.html_adms_agents.AdmAgentInfoHandler")
async def adm_agent_action(
    request: Request,
    username: str,
    action: str,
    balance: int = 0,
    karma: int = 0,
    exp: int = 0,
    current_user: CurrentActiveUser = None,
) -> dict[str, str]:
    """
    Perform agent modification actions (requires access level 1+).

    Actions:
    - balance: Set agent balance
    - karma: Set agent karma (-100 to 100)
    - exp: Set agent experience
    - reset_skills: Reset all skills and perks
    - reset_perks: Reset only perks

    Args:
        username: Target username
        action: Action to perform
        balance: New balance (for balance action)
        karma: New karma (for karma action)
        exp: New experience (for exp action)

    Returns:
        Action result

    Migration from: sublayers_server.handlers.adm_api.html_adms_agents.AdmAgentInfoHandler
    """
    check_admin_access(current_user, required_level=1)

    user = await get_user_by_username(username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {username} not found"
        )

    # TODO: Check if user is online
    # if user_online(username=user.username):
    #     raise HTTPException(status_code=503, detail="Agent is online")

    # TODO: Get agent from server or database
    # agent = get_agent_for_user(user)
    # if not agent:
    #     raise HTTPException(status_code=404, detail="Agent not found")

    if action == "balance":
        # TODO: Set balance
        # agent.profile.set_balance(new_balance=max(int(balance), 0))
        # agent.save()
        logger.warning(
            f"Balance changed for {username} by {current_user.username} to {balance}"
        )
        return {"status": f"Balance changed for {username} to {balance}"}

    elif action == "karma":
        # TODO: Set karma
        # karma = max(min(int(karma), 100), -100)
        # agent.profile.set_karma(value=karma)
        # agent.save()
        logger.warning(
            f"Karma changed for {username} by {current_user.username} to {karma}"
        )
        return {"status": f"Karma changed for {username} to {karma}"}

    elif action == "exp":
        # TODO: Set exp
        # agent.profile.set_exp(value=max(int(exp), 0))
        # agent.save()
        logger.warning(
            f"Exp changed for {username} by {current_user.username} to {exp}"
        )
        return {"status": f"Exp changed for {username} to {exp}"}

    elif action == "reset_skills":
        # TODO: Reset all skills and perks
        logger.warning(
            f"Skills and perks reset for {username} by {current_user.username}"
        )
        return {"status": f"Skills and perks reset for {username}"}

    elif action == "reset_perks":
        # TODO: Reset only perks
        logger.warning(f"Perks reset for {username} by {current_user.username}")
        return {"status": f"Perks reset for {username}"}

    return {"status": "OK"}


# Additional admin handlers for quests, inventory, NPC relations, history
# These are simplified stubs - full implementation requires game logic

@router.get("/adm/quests", response_class=HTMLResponse)
@migration_target("sublayers_server.handlers.adm_api.html_adms_agents.AdmAgentQuestsInfoHandler")
async def adm_agent_quests_handler(
    request: Request,
    username: str,
    current_user: CurrentActiveUser = None,
) -> HTMLResponse:
    """Display agent quests (requires access level 1+)."""
    check_admin_access(current_user, required_level=1)

    if not templates:
        raise HTTPException(status_code=500, detail="Templates not configured")

    user = await get_user_by_username(username)
    if not user:
        raise HTTPException(status_code=404, detail=f"User {username} not found")

    return templates.TemplateResponse(
        "adm/quests.html",
        {"request": request, "user": user, "current_user": current_user}
    )


@router.get("/adm/quests_inventory", response_class=HTMLResponse)
@migration_target("sublayers_server.handlers.adm_api.html_adms_agents.AdmAgentQuestsInventoryHandler")
async def adm_agent_quests_inventory_handler(
    request: Request,
    username: str,
    current_user: CurrentActiveUser = None,
) -> HTMLResponse:
    """Display agent quest inventory (requires access level 1+)."""
    check_admin_access(current_user, required_level=1)

    if not templates:
        raise HTTPException(status_code=500, detail="Templates not configured")

    user = await get_user_by_username(username)
    if not user:
        raise HTTPException(status_code=404, detail=f"User {username} not found")

    return templates.TemplateResponse(
        "adm/quests_inventory.html",
        {"request": request, "user": user, "current_user": current_user}
    )


@router.get("/adm/npc_relations", response_class=HTMLResponse)
@migration_target("sublayers_server.handlers.adm_api.html_adms_agents.AdmAgentNPCRelationsHandler")
async def adm_agent_npc_relations_handler(
    request: Request,
    username: str,
    current_user: CurrentActiveUser = None,
) -> HTMLResponse:
    """Display agent NPC relations (requires access level 1+)."""
    check_admin_access(current_user, required_level=1)

    if not templates:
        raise HTTPException(status_code=500, detail="Templates not configured")

    user = await get_user_by_username(username)
    if not user:
        raise HTTPException(status_code=404, detail=f"User {username} not found")

    return templates.TemplateResponse(
        "adm/npc_relations.html",
        {"request": request, "user": user, "current_user": current_user}
    )


@router.get("/adm/gamelogs", response_class=HTMLResponse)
@migration_target("sublayers_server.handlers.adm_api.html_adms_agents.AdmUserHystoryHandler")
async def adm_user_history_handler(
    request: Request,
    username: str,
    types: str = "",
    limit: int = 100,
    ds: int = 0,
    df: int = 0,
    current_user: CurrentActiveUser = None,
) -> HTMLResponse:
    """
    Display user game history logs (requires access level 1+).

    Args:
        username: Username to display logs for
        types: Filter by log types (dot-separated)
        limit: Maximum number of logs to return
        ds: Start date timestamp
        df: End date timestamp
    """
    check_admin_access(current_user, required_level=1)

    if not templates:
        raise HTTPException(status_code=500, detail="Templates not configured")

    user = await get_user_by_username(username)
    if not user:
        raise HTTPException(status_code=404, detail=f"User {username} not found")

    # TODO: Query admin log records
    # types_list = [t for t in types.split('.') if t]
    # adm_logs = query_admin_logs(user_id=user.id, types=types_list, limit=limit, ...)
    adm_logs = []

    return templates.TemplateResponse(
        "adm/gamelogs.html",
        {
            "request": request,
            "user": user,
            "adm_logs": adm_logs,
            "all_types": [],  # TODO: Get from AdminLogRecord.all_used_types()
            "current_user": current_user,
        }
    )
