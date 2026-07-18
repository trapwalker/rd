"""Main menu routes for game interface."""

import logging

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from app.config import get_settings
from app.core.deps import OptionalCookieUser
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


@router.get("/menu/character", response_class=HTMLResponse)
@migration_target("sublayers_server.handlers.main_menu_character.MenuCharacterHandler")
async def menu_character(
    request: Request,
    user: OptionalCookieUser = None,
) -> HTMLResponse:
    """
    Open character menu window.

    Shows character stats, skills, and progression.

    Migration from: sublayers_server.handlers.main_menu_character.MenuCharacterHandler
    """
    if not templates:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Templates not configured"
        )

    if user:
        # TODO: Get agent and log
        # agent = await get_agent_for_user(user)
        # if agent:
        #     agent.log.info('open character_window')
        logger.info(f"User {user.username} opening character menu")

    return templates.TemplateResponse(
        request,
        "menu/character.html",
        {
            "request": request,
            "user": user,
        }
    )


@router.get("/menu/journal", response_class=HTMLResponse)
@migration_target("sublayers_server.handlers.main_menu_journal.MenuJournalHandler")
async def menu_journal(
    request: Request,
    user: OptionalCookieUser = None,
) -> HTMLResponse:
    """
    Open journal/quest log menu window.

    Mode-dependent:
    - Basic mode: Full journal with quests
    - Quick mode: Simplified placeholder

    Migration from: sublayers_server.handlers.main_menu_journal.MenuJournalHandler
    """
    if not templates:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Templates not configured"
        )

    template_name = "menu/journal.html"
    if settings.environment == "quick":
        template_name = "menu/quick_mode_plug.html"

    return templates.TemplateResponse(
        request,
        template_name,
        {
            "request": request,
            "user": user,
            "mode": settings.environment,
        }
    )


@router.get("/menu/settings", response_class=HTMLResponse)
@migration_target("sublayers_server.handlers.main_menu_settings.MenuSettingsHandler")
async def menu_settings(
    request: Request,
    user: OptionalCookieUser = None,
) -> HTMLResponse:
    """
    Open settings menu window.

    Allows changing game settings, controls, audio, etc.

    Migration from: sublayers_server.handlers.main_menu_settings.MenuSettingsHandler
    """
    if not templates:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Templates not configured"
        )

    return templates.TemplateResponse(
        request,
        "menu/settings.html",
        {
            "request": request,
            "user": user,
        }
    )


@router.get("/menu/radio", response_class=HTMLResponse)
@migration_target("sublayers_server.handlers.main_menu_radio.MenuRadioHandler")
async def menu_radio(
    request: Request,
    user: OptionalCookieUser = None,
) -> HTMLResponse:
    """
    Open radio menu window.

    In-game radio/communication system.

    Migration from: sublayers_server.handlers.main_menu_radio.MenuRadioHandler
    """
    if not templates:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Templates not configured"
        )

    return templates.TemplateResponse(
        request,
        "menu/radio.html",
        {
            "request": request,
            "user": user,
        }
    )


@router.get("/menu/party", response_class=HTMLResponse)
@migration_target("sublayers_server.handlers.party_handler.MenuPartyHandler")
async def menu_party(
    request: Request,
    user: OptionalCookieUser = None,
) -> HTMLResponse:
    """
    Open party/group menu window.

    Manage party members, invitations, etc.
    Mode-dependent (basic/quick).

    Migration from: sublayers_server.handlers.party_handler.MenuPartyHandler
    """
    if not templates:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Templates not configured"
        )

    template_name = "menu/party.html"
    if settings.environment == "quick":
        template_name = "menu/quick_mode_plug.html"

    return templates.TemplateResponse(
        request,
        template_name,
        {
            "request": request,
            "user": user,
            "mode": settings.environment,
        }
    )


@router.get("/menu/car", response_class=HTMLResponse)
@migration_target("sublayers_server.handlers.main_car_info.MenuCarHandler")
async def menu_car(
    request: Request,
    user: OptionalCookieUser = None,
) -> HTMLResponse:
    """
    Open car menu window.

    Shows car info, upgrades, customization.

    Migration from: sublayers_server.handlers.main_car_info.MenuCarHandler
    """
    if not templates:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Templates not configured"
        )

    return templates.TemplateResponse(
        request,
        "menu/car.html",
        {
            "request": request,
            "user": user,
        }
    )


@router.get("/menu/nucoil", response_class=HTMLResponse)
@migration_target("sublayers_server.handlers.main_menu_nucoil.MainMenuNucoilHandler")
async def menu_nucoil(
    request: Request,
    user: OptionalCookieUser = None,
) -> HTMLResponse:
    """
    Open nucoil menu window.

    Requires car (energy/fuel management system).

    Migration from: sublayers_server.handlers.main_menu_nucoil.MainMenuNucoilHandler
    """
    if not templates:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Templates not configured"
        )

    # TODO: Check if user has car
    # if user:
    #     agent = await get_agent_for_user(user)
    #     if not agent or not agent.car:
    #         raise HTTPException(status_code=404, detail="Car required")

    return templates.TemplateResponse(
        request,
        "menu/nucoil.html",
        {
            "request": request,
            "user": user,
        }
    )


@router.get("/context-panel", response_class=HTMLResponse)
@migration_target("sublayers_server.handlers.context_panel.ContextPanelListHandler")
async def context_panel_list(
    request: Request,
    user: OptionalCookieUser = None,
) -> HTMLResponse:
    """
    Open context panel list window.

    Contextual actions based on current situation.

    Migration from: sublayers_server.handlers.context_panel.ContextPanelListHandler
    """
    if not templates:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Templates not configured"
        )

    return templates.TemplateResponse(
        request,
        "context_panel.html",
        {
            "request": request,
            "user": user,
        }
    )
