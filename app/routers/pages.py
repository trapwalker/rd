"""Page rendering routes (HTML templates)."""

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates

from app.config import get_settings
from app.core.deps import (
    CurrentUnbannedUser,
    OptionalCookieUser,
    ServerStateDep,
    check_server_not_closed,
    get_server_state,
)
from app.core.redis_rate_limiter import get_rate_limiter
from app.models.user import User
from app.utils.deprecation import migration_target

logger = logging.getLogger(__name__)

router = APIRouter()
settings = get_settings()

# Initialize Jinja2 templates
try:
    templates = Jinja2Templates(directory="templates")
    # Register XSS protection filters
    from app.core.template_filters import TEMPLATE_FILTERS
    for filter_name, filter_func in TEMPLATE_FILTERS.items():
        templates.env.filters[filter_name] = filter_func
except Exception as e:
    logger.warning(f"Templates directory not found: {e}")
    templates = None


@router.get("/play", response_class=HTMLResponse, response_model=None)
@migration_target("sublayers_server.handlers.pages.PlayHandler")
async def play_handler(
    request: Request,
    mode: str = "",
    user: OptionalCookieUser = None,
    server_state: ServerStateDep = None,
):
    """
    Main game entry point.

    Renders play page with game client. Handles:
    - Authentication check
    - Ban check
    - Server status check
    - Rate limiting
    - Teaching mode
    - Basic vs Quick game modes
    - Coordinate loading

    Migration from: sublayers_server.handlers.pages.PlayHandler
    """
    # Check if templates are available
    if not templates:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Templates not configured"
        )

    # Redirect from old domain (migration logic)
    host = request.url.hostname or ""
    if host == "roaddogs.ru":
        if mode == "electron":
            return RedirectResponse(
                url="https://eu.roaddogs.online/static/connection_trouble.html",
                status_code=status.HTTP_301_MOVED_PERMANENTLY
            )
        return RedirectResponse(
            url="https://eu.roaddogs.online",
            status_code=status.HTTP_301_MOVED_PERMANENTLY
        )

    # Check authentication
    if not user:
        login_url = settings.cors_origins[0] if settings.cors_origins else "/api/auth/login"
        return RedirectResponse(url=login_url, status_code=status.HTTP_302_FOUND)

    # Check server status
    if server_state.is_closed_for_agents:
        return templates.TemplateResponse(
            "banned.html",
            {
                "request": request,
                "user": user,
                "is_server_closed": True,
                "reason": server_state.maintenance_message or "Technical timeout",
            }
        )

    # Check if user is banned
    if user.is_banned:
        return templates.TemplateResponse(
            "banned.html",
            {
                "request": request,
                "user": user,
                "is_server_closed": False,
                "reason": user.ban_reason or "",
            }
        )

    # Rate limiting check (Redis-based, distributed)
    try:
        limiter = get_rate_limiter()
        await limiter.check_frequency(
            user_id=str(user.id),
            endpoint="/play",
            max_calls=5,  # 5 requests
            window_seconds=90  # per 90 seconds
        )
    except HTTPException as e:
        if e.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
            logger.warning(f"Rate limit exceeded for {user.username} on /play")
            raise
    except RuntimeError:
        # Rate limiter not initialized - log warning but allow request
        logger.warning("Rate limiter not initialized - allowing request")

    # Detect electron mode
    is_electron = mode == "electron"

    logger.info(f"{user.username} accessing play page [electron={is_electron}]")

    # Update user language based on request
    user_lang = request.cookies.get("lang") or detect_language_from_host(host)
    if user.lang != user_lang:
        user.lang = user_lang
        await user.save()

    # Handle Basic game mode
    if settings.environment == "basic":
        return await _handle_basic_mode(
            request=request,
            user=user,
            is_electron=is_electron,
            user_lang=user_lang,
        )

    # Handle Quick game mode
    if settings.environment == "quick":
        return await _handle_quick_mode(
            request=request,
            user=user,
            is_electron=is_electron,
            user_lang=user_lang,
        )

    # Default: render play page
    return templates.TemplateResponse(
        "play.html",
        {
            "request": request,
            "ws_port": settings.port,  # WebSocket port
            "map_link": "/map",  # Map tiles: served by nginx (or the /map static mount below) from sublayers_world/tiles/map
            "server_mode": settings.environment,
            "host_name": host,
            "user_name": user.username,
            "user_lang": user_lang,
            "first_enter": False,
            "start_coord": user.start_position or {"x": 0.0, "y": 0.0},
            "insurance_name": "basic",
            "user_balance": user.coins,
            "connection_delay": 0,
            "electron": is_electron,
        }
    )


async def _handle_basic_mode(
    request: Request,
    user: User,
    is_electron: bool,
    user_lang: str,
) -> HTMLResponse | RedirectResponse:
    """
    Handle basic game mode.

    Requires:
    - Teaching completion or tester status
    - Agent creation
    - Coordinate loading
    """
    # Check teaching state
    if not user.quick and not user.is_tester and user.registration_status == "register":
        first_enter = user.teaching_state == ""  # Unknown teaching state

        if user.teaching_state not in ("map", "map_start"):
            # Teaching not completed - allow play
            coord = user.start_position or {"x": 0.0, "y": 0.0}

            return templates.TemplateResponse(
                "play.html",
                {
                    "request": request,
                    "ws_port": settings.port,
                    "map_link": "/map",
                    "server_mode": "basic",
                    "host_name": request.url.hostname or "",
                    "user_name": user.username,
                    "user_lang": user_lang,
                    "first_enter": first_enter,
                    "start_coord": coord,
                    "insurance_name": "basic",  # TODO: Get from agent
                    "user_balance": user.coins,
                    "connection_delay": 0,
                    "electron": is_electron,
                }
            )
        else:
            # Redirect to quick mode for teaching
            logger.warning(
                f"{user.username} with teaching_state={user.teaching_state} "
                f"trying to connect to main server"
            )
            redirect_url = f"/quick/play{'?mode=electron' if is_electron else ''}"
            return RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)

    # User is quick mode or teaching not applicable
    login_url = settings.cors_origins[0] if settings.cors_origins else "/api/auth/login"
    return RedirectResponse(url=login_url, status_code=status.HTTP_302_FOUND)


async def _handle_quick_mode(
    request: Request,
    user: User,
    is_electron: bool,
    user_lang: str,
) -> HTMLResponse | RedirectResponse:
    """
    Handle quick game mode.

    Quick mode allows:
    - Tutorial/teaching gameplay
    - Fast respawn
    - Simplified gameplay
    """
    # Check if user should be in basic mode
    if not user.quick and user.teaching_state not in ("map", "map_start"):
        logger.warning(
            f"{user.username} with teaching_state={user.teaching_state} "
            f"trying to connect to quick server"
        )
        redirect_url = f"/play{'?mode=electron' if is_electron else ''}"
        return RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)

    # TODO: Check if agent exists for map_start state
    # For now, use stored or random coordinates
    coord = user.start_position or {"x": 0.0, "y": 0.0}

    # Update start position
    user.start_position = coord
    await user.save()

    return templates.TemplateResponse(
        "play.html",
        {
            "request": request,
            "ws_port": settings.port,
            "map_link": "/map",
            "server_mode": "quick",
            "host_name": request.url.hostname or "",
            "user_name": user.username,
            "user_lang": user_lang,
            "first_enter": False,
            "start_coord": coord,
            "insurance_name": "quick",
            "user_balance": 0,  # Quick mode has no balance
            "connection_delay": 0,
            "electron": is_electron,
        }
    )


@router.get("/mobile/play", response_class=HTMLResponse)
@migration_target("sublayers_server.handlers.pages.MobilePlayHandler")
async def mobile_play_handler(
    request: Request,
) -> HTMLResponse:
    """
    Mobile version of play page.

    Performs quick registration and renders mobile template.

    Migration from: sublayers_server.handlers.pages.MobilePlayHandler
    """
    if not templates:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Templates not configured"
        )

    # TODO: Implement quick registration for mobile

    return templates.TemplateResponse(
        "mobile/play.html",
        {
            "request": request,
            "ws_port": settings.port,
            "map_link": "/map",
            "host_name": request.url.hostname or "",
        }
    )


def detect_language_from_host(host: str) -> str:
    """
    Detect language from hostname.

    Args:
        host: Request hostname

    Returns:
        Language code (en, ru, etc.)
    """
    if "roaddogs.ru" in host:
        return "ru"
    return "en"
