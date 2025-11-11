"""Person/agent info routes."""

import logging

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from app.core.deps import CurrentUnbannedUser
from app.models.user import User
from app.utils.deprecation import migration_target

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize Jinja2 templates
try:
    templates = Jinja2Templates(directory="templates")
except Exception as e:
    logger.warning(f"Templates directory not found: {e}")
    templates = None


@router.get("/person-info", response_class=HTMLResponse)
@migration_target("sublayers_server.handlers.main_car_info.PersonInfoHandler")
async def person_info_handler(
    request: Request,
    person: str,
    mode: str = "city",
    current_user: CurrentUnbannedUser = None,
) -> HTMLResponse:
    """
    Display person/player info window.

    Shows other player's profile, car, level, exp, etc.

    Args:
        person: Person/agent name to display
        mode: Display mode ('map' or 'city')
        current_user: Current authenticated user

    Returns:
        HTML response with person info

    Migration from: sublayers_server.handlers.main_car_info.PersonInfoHandler
    """
    if not templates:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Templates not configured"
        )

    # TODO: Find agent by name
    # person_agent = await get_agent_by_name(person)
    # if not person_agent:
    #     raise HTTPException(status_code=404, detail="Person not found online")

    # For now, find user by username as proxy
    person_user = await User.find_one(User.username == person)
    if not person_user:
        logger.warning(f"Person {person} not found online")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Person {person} not found online"
        )

    logger.info(
        f"User {current_user.username} viewing info for {person} (mode: {mode})"
    )

    # TODO: Calculate level from exp table
    # lvl, (nxt_lvl, nxt_lvl_exp), rest_exp = person_agent.example.profile.exp_table.by_exp(...)
    # car = person_agent.car.example if person_agent.car else None

    template_name = "person/person_info_chat.html" if mode == "city" else "person/person_window.html"

    return templates.TemplateResponse(
        template_name,
        {
            "request": request,
            "person": person_user,
            "lvl": person_user.level,
            "car": None,  # TODO: Get from agent
            "mode": mode,
            "viewer": current_user,
        }
    )


@router.get("/person-info/corpse", response_class=HTMLResponse)
@migration_target("sublayers_server.handlers.main_car_info.PersonInfoCorpseHandler")
async def person_info_corpse_handler(
    request: Request,
    container_id: str,
    current_user: CurrentUnbannedUser = None,
) -> HTMLResponse:
    """
    Display info about dead player's corpse/loot.

    Shows the deceased player's profile from corpse container.

    Args:
        container_id: POICorpse container ID
        current_user: Current authenticated user

    Returns:
        HTML response with corpse/person info

    Migration from: sublayers_server.handlers.main_car_info.PersonInfoCorpseHandler
    """
    if not templates:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Templates not configured"
        )

    # TODO: Get container from game server
    # container = await get_container(container_id)
    # if not container or not isinstance(container, POICorpse) or not container.agent_donor:
    #     raise HTTPException(status_code=404)
    # person = container.agent_donor
    # car = container.donor_car

    logger.info(
        f"User {current_user.username} viewing corpse info for container {container_id}"
    )

    # Mock data for now
    return templates.TemplateResponse(
        "person/person_window.html",
        {
            "request": request,
            "person": None,  # TODO: Get from container.agent_donor
            "lvl": 1,
            "car": None,  # TODO: Get from container.donor_car
            "is_corpse": True,
            "viewer": current_user,
        }
    )


@router.get("/car-info-main", response_class=HTMLResponse)
@migration_target("sublayers_server.handlers.main_car_info.MainCarInfoHandler")
async def main_car_info_handler(
    request: Request,
    current_user: CurrentUnbannedUser = None,
) -> HTMLResponse:
    """
    Display main car info window.

    Note: Likely not used based on original comment.

    Args:
        current_user: Current authenticated user

    Returns:
        HTML response with car info

    Migration from: sublayers_server.handlers.main_car_info.MainCarInfoHandler
    """
    if not templates:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Templates not configured"
        )

    # TODO: Get agent for current user
    # agent = await get_agent_for_user(current_user)
    # car = agent.example.profile.car

    logger.warning(
        f"MainCarInfoHandler called by {current_user.username} "
        "(likely not used)"
    )

    return templates.TemplateResponse(
        "car/main_car_info.html",
        {
            "request": request,
            "user": current_user,
            "car": None,  # TODO: Get from agent
        }
    )
