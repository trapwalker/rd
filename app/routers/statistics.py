"""Statistics and monitoring routes (localhost only)."""

import logging
from datetime import date, timedelta
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from app.config import get_settings
from app.routers.admin import check_localhost
from app.utils.deprecation import migration_target

logger = logging.getLogger(__name__)

router = APIRouter()
settings = get_settings()

# Initialize Jinja2 templates
try:
    templates = Jinja2Templates(directory="templates")
except Exception as e:
    logger.warning(f"Templates directory not found: {e}")
    templates = None


@router.get("/statistics/server", response_class=HTMLResponse)
@migration_target("sublayers_server.handlers.statistics.ServerStatisticsHandler")
async def server_statistics_handler(
    request: Request,
) -> HTMLResponse:
    """
    Display server statistics dashboard (localhost only).

    Shows:
    - Active players/agents count
    - Quick game bot status (in quick mode)
    - Server resource usage
    - Connection metrics

    Returns:
        HTML response with server statistics

    Migration from: sublayers_server.handlers.statistics.ServerStatisticsHandler
    """
    check_localhost(request)

    if not templates:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Templates not configured"
        )

    # TODO: Get real server stats
    # server_stat = server.get_server_stat()
    # quick_game_bot_info = [agent for agent in server.agents.values() if isinstance(agent, AI)]

    server_stat = {
        "active_players": 0,
        "active_npcs": 0,
        "websocket_connections": 0,
        "uptime_seconds": 0,
        "memory_usage_mb": 0,
    }

    logger.info("Server statistics accessed from localhost")

    return templates.TemplateResponse(
        "statistics/module_entry_server_stats.html",
        {
            "request": request,
            "server_stat": server_stat,
            "quick_game_bot_info": [],
        }
    )


@router.post("/statistics/server")
@migration_target("sublayers_server.handlers.statistics.ServerStatisticsHandler")
async def server_statistics_action(
    request: Request,
    action: str,
    bot_name: str = "",
) -> dict[str, str]:
    """
    Perform server statistics actions (localhost only).

    Actions:
    - bot_change: Toggle AI bot active/inactive
    - bot_refresh: Refresh server stats

    Args:
        action: Action to perform
        bot_name: Bot name (for bot_change action)

    Returns:
        Action result

    Migration from: sublayers_server.handlers.statistics.ServerStatisticsHandler
    """
    check_localhost(request)

    if action == "bot_change":
        if not bot_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="bot_name required for bot_change action"
            )

        # TODO: Get agent by name and toggle worked flag
        # ai_bot = server.agents_by_name.get(bot_name)
        # if not ai_bot:
        #     raise HTTPException(status_code=404, detail="Bot not found")
        # ai_bot.worked = not ai_bot.worked

        logger.info(f"Bot {bot_name} worked flag toggled")
        return {"status": "ok"}

    elif action == "bot_refresh":
        # TODO: Return fresh server stats
        return {
            "active_players": "0",
            "active_npcs": "0",
            "websocket_connections": "0",
        }

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Unknown action: {action}"
    )


@router.get("/statistics/for-site")
@migration_target("sublayers_server.handlers.statistics.ServerStatForSite")
async def server_stat_for_site(
    request: Request,
) -> dict[str, int]:
    """
    Public server statistics for website display.

    Returns minimal stats for public display (no auth required).

    Returns:
        Public server statistics

    Migration from: sublayers_server.handlers.statistics.ServerStatForSite
    """
    # TODO: Get from stat_log
    # stat_log = server.stat_log
    # s_agents_on = len(server.clients)
    # s_observers_on = stat_log.get_metric('s_observers_on')

    return {
        "s_agents_on": 0,  # Active players
        "s_observers_on": 0,  # Spectators/observers
    }


@router.get("/statistics/messages", response_class=HTMLResponse)
@migration_target("sublayers_server.handlers.statistics.ServerStatMessagesHandler")
async def server_stat_messages_handler(
    request: Request,
) -> HTMLResponse:
    """
    Display message statistics (localhost only).

    Shows metrics for all message types processed by server.

    Returns:
        HTML response with message statistics

    Migration from: sublayers_server.handlers.statistics.ServerStatMessagesHandler
    """
    check_localhost(request)

    if not templates:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Templates not configured"
        )

    # TODO: Get from Message.messages_metrics
    messages_metrics = {}

    logger.info("Message statistics accessed from localhost")

    return templates.TemplateResponse(
        "statistics/messages_stats.html",
        {
            "request": request,
            "messages_metrics": messages_metrics,
        }
    )


@router.get("/statistics/events", response_class=HTMLResponse)
@migration_target("sublayers_server.handlers.statistics.ServerStatEventsHandler")
async def server_stat_events_handler(
    request: Request,
) -> HTMLResponse:
    """
    Display event statistics (localhost only).

    Shows metrics for all game events, sorted by count.

    Returns:
        HTML response with event statistics

    Migration from: sublayers_server.handlers.statistics.ServerStatEventsHandler
    """
    check_localhost(request)

    if not templates:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Templates not configured"
        )

    # TODO: Get from Event.events_metrics
    # events_metrics = sorted(Event.events_metrics.values(), key=lambda rec: rec["count"], reverse=True)
    events_metrics = []

    logger.info("Event statistics accessed from localhost")

    return templates.TemplateResponse(
        "statistics/events_stats.html",
        {
            "request": request,
            "events_metrics": events_metrics,
        }
    )


@router.get("/statistics/quests", response_class=HTMLResponse)
@migration_target("sublayers_server.handlers.statistics.ServerStatQuestsHandler")
async def server_stat_quests_handler(
    request: Request,
) -> HTMLResponse:
    """
    Display quest statistics (localhost only).

    Shows metrics for all quests, sorted by count.

    Returns:
        HTML response with quest statistics

    Migration from: sublayers_server.handlers.statistics.ServerStatQuestsHandler
    """
    check_localhost(request)

    if not templates:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Templates not configured"
        )

    # TODO: Get from quests instantiate_stat
    # from sublayers_server.model.registry_me.classes.quests import instantiate_stat
    # quests_metrics = sorted(instantiate_stat.values(), key=lambda rec: rec["count"], reverse=True)
    quests_metrics = []

    logger.info("Quest statistics accessed from localhost")

    return templates.TemplateResponse(
        "statistics/quests_stats.html",
        {
            "request": request,
            "quests_metrics": quests_metrics,
        }
    )


@router.get("/statistics/handlers", response_class=HTMLResponse)
@migration_target("sublayers_server.handlers.statistics.ServerStatHandlersHandler")
async def server_stat_handlers_handler(
    request: Request,
) -> HTMLResponse:
    """
    Display handler statistics (localhost only).

    Shows metrics for all request handlers, sorted by count.

    Returns:
        HTML response with handler statistics

    Migration from: sublayers_server.handlers.statistics.ServerStatHandlersHandler
    """
    check_localhost(request)

    if not templates:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Templates not configured"
        )

    # TODO: Track handler metrics in FastAPI
    # handlers_metrics = sorted(BaseHandler.handlers_metrics.values(), key=lambda rec: rec["count"], reverse=True)
    handlers_metrics = []

    logger.info("Handler statistics accessed from localhost")

    return templates.TemplateResponse(
        "statistics/handlers_stats.html",
        {
            "request": request,
            "handlers_metrics": handlers_metrics,
        }
    )


@router.get("/statistics/graphics", response_class=HTMLResponse)
@migration_target("sublayers_server.handlers.statistics.ServerStatGraphicsHandler")
async def server_stat_graphics_handler(
    request: Request,
    start: str | None = None,
    end: str | None = None,
    last_days: int | None = None,
) -> HTMLResponse:
    """
    Display server statistics graphics/charts (localhost only).

    Shows historical charts from CSV stat files.

    Args:
        start: Start date (YYYY-MM-DD)
        end: End date (YYYY-MM-DD)
        last_days: Last N days (overrides start/end)

    Returns:
        HTML response with statistics charts

    Migration from: sublayers_server.handlers.statistics.ServerStatGraphicsHandler
    """
    check_localhost(request)

    if not templates:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Templates not configured"
        )

    # Parse date range
    today = date.today()
    start_date = today
    end_date = today

    if last_days:
        try:
            start_date = today - timedelta(days=last_days - 1)
            end_date = today
        except Exception as e:
            logger.warning(f"Invalid last_days format: {e}")

    if start:
        try:
            parts = start.split("-")
            start_date = date(int(parts[0]), int(parts[1]), int(parts[2]))
        except Exception as e:
            logger.warning(f"Invalid start date format: {e}")

    if end:
        try:
            parts = end.split("-")
            end_date = date(int(parts[0]), int(parts[1]), int(parts[2]))
        except Exception as e:
            logger.warning(f"Invalid end date format: {e}")

    # Find stat files in date range
    stat_path = Path(settings.static_path) / "stat"
    file_list = []
    event_file_list = []

    if stat_path.exists():
        # TODO: Find stat files matching date range
        # file_list_all = stat_path.glob("stat.csv.*")
        # event_file_list_all = stat_path.glob("stat_events.csv.*")
        pass

    logger.info(f"Graphics statistics accessed for date range {start_date} to {end_date}")

    return templates.TemplateResponse(
        "statistics/graphics_stats.html",
        {
            "request": request,
            "file_list": file_list,
            "event_file_list": event_file_list,
            "start_date": str(start_date),
            "end_date": str(end_date),
        }
    )


@router.get("/statistics/event-graphics", response_class=HTMLResponse)
@migration_target("sublayers_server.handlers.statistics.ServerStatEventGraphicsHandler")
async def server_stat_event_graphics_handler(
    request: Request,
    start: str | None = None,
    end: str | None = None,
    last_days: int | None = None,
) -> HTMLResponse:
    """
    Display event statistics graphics/charts (localhost only).

    Shows historical event charts from CSV files.

    Args:
        start: Start date (YYYY-MM-DD)
        end: End date (YYYY-MM-DD)
        last_days: Last N days (overrides start/end)

    Returns:
        HTML response with event charts

    Migration from: sublayers_server.handlers.statistics.ServerStatEventGraphicsHandler
    """
    check_localhost(request)

    if not templates:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Templates not configured"
        )

    # Parse date range
    today = date.today()
    start_date = today
    end_date = today

    if last_days:
        try:
            start_date = today - timedelta(days=last_days - 1)
            end_date = today
        except Exception as e:
            logger.warning(f"Invalid last_days format: {e}")

    if start:
        try:
            parts = start.split("-")
            start_date = date(int(parts[0]), int(parts[1]), int(parts[2]))
        except Exception as e:
            logger.warning(f"Invalid start date format: {e}")

    if end:
        try:
            parts = end.split("-")
            end_date = date(int(parts[0]), int(parts[1]), int(parts[2]))
        except Exception as e:
            logger.warning(f"Invalid end date format: {e}")

    # Find event stat files in date range
    stat_path = Path(settings.static_path) / "stat"
    file_list = []

    if stat_path.exists():
        # TODO: Find event stat files matching date range
        # file_list_all = stat_path.glob("stat_events.csv.*")
        pass

    logger.info(f"Event graphics statistics accessed for date range {start_date} to {end_date}")

    return templates.TemplateResponse(
        "statistics/event_graphics_stats.html",
        {
            "request": request,
            "file_list": file_list,
            "start_date": str(start_date),
            "end_date": str(end_date),
        }
    )
