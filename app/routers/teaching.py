"""Teaching and tutorial routes."""

import logging

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import HTMLResponse, PlainTextResponse, RedirectResponse

from app.core.deps import CurrentUser, OptionalCookieUser
from app.models.user import User
from app.utils.deprecation import migration_target
from fastapi.templating import Jinja2Templates

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize Jinja2 templates
try:
    templates = Jinja2Templates(directory="templates")
except Exception as e:
    logger.warning(f"Templates directory not found: {e}")
    templates = None


# Tutorial window names mapping
TUTORIAL_WINDOWS = {
    "cruise_speed": "Cruise Speed Tutorial",
    "cruise_zone": "Cruise Zone Tutorial",
    "cruise_speed_control": "Speed Control Tutorial",
    "cruise_speed_btn": "Speed Button Tutorial",
    "driving_control": "Driving Control Tutorial",
    "cruise_radial": "Radial Menu Tutorial",
    "zoom_slider": "Zoom Slider Tutorial",
    "discharge_shooting": "Discharge Shooting Tutorial",
    "auto_shooting": "Auto Shooting Tutorial",
    "try_kill": "Combat Tutorial",
    "try_game": "Try Game Tutorial",
}


@router.get("/teaching", response_class=HTMLResponse)
@migration_target("sublayers_server.handlers.teaching.MapTeachingHandler")
async def map_teaching_handler(
    request: Request,
    window_name: str = "",
) -> HTMLResponse:
    """
    Render teaching/tutorial window based on window_name parameter.

    Supported windows:
    - cruise_speed, cruise_zone, cruise_speed_control, cruise_speed_btn
    - driving_control, cruise_radial, zoom_slider
    - discharge_shooting, auto_shooting
    - try_kill, try_game

    Args:
        window_name: Name of the tutorial window to display

    Returns:
        HTML response with tutorial content

    Migration from: sublayers_server.handlers.teaching.MapTeachingHandler
    """
    if not templates:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Templates not configured"
        )

    if window_name not in TUTORIAL_WINDOWS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tutorial window '{window_name}' not found"
        )

    logger.info(f"Rendering tutorial window: {window_name}")

    # Try to render specific template if it exists,
    # otherwise use generic tutorial template
    template_path = f"teaching/{window_name}.html"
    tutorial_title = TUTORIAL_WINDOWS[window_name]

    try:
        return templates.TemplateResponse(
            request,
            template_path,
            {
                "request": request,
                "window_name": window_name,
                "tutorial_title": tutorial_title,
            }
        )
    except Exception:
        # Fallback to generic tutorial template
        return templates.TemplateResponse(
            request,
            "teaching/generic.html",
            {
                "request": request,
                "window_name": window_name,
                "tutorial_title": tutorial_title,
            }
        )


@router.get("/teaching/answer", response_class=PlainTextResponse, response_model=None)
@migration_target("sublayers_server.handlers.teaching.ConsoleAnswerTeachingHandler")
async def console_answer_teaching(
    answer: bool = False,
    user: OptionalCookieUser = None,
):
    """
    Handle tutorial consent answer.

    Updates user teaching_state and car_index based on answer.

    Args:
        answer: True if user wants tutorial, False to skip
        user: Current user (from cookie)

    Returns:
        Redirect URL for tutorial or empty string

    Migration from: sublayers_server.handlers.teaching.ConsoleAnswerTeachingHandler
    """
    if not user:
        return PlainTextResponse("")

    # Only process if user hasn't answered before
    if user.teaching_state == "":
        user.teaching_state = "map" if answer else "cancel"
        user.car_index = 2
        await user.save()

        if answer:
            logger.info(f"User {user.username} starting tutorial")
            return RedirectResponse(url="/quick/play", status_code=status.HTTP_302_FOUND)
        else:
            logger.info(f"User {user.username} skipped tutorial")
            return PlainTextResponse("")
    else:
        # User already answered
        logger.warning(
            f"User {user.username} with teaching_state={user.teaching_state} "
            f"tried to answer tutorial consent again"
        )
        return PlainTextResponse("")


@router.get("/teaching/reset", response_class=PlainTextResponse)
@migration_target("sublayers_server.handlers.teaching.ResetTeachingHandler")
async def reset_teaching_handler(
    state: str = "",
    user: OptionalCookieUser = None,
) -> PlainTextResponse:
    """
    Reset user teaching state (admin/debug tool).

    Args:
        state: New teaching state to set
        user: Current user (from cookie)

    Returns:
        Success message with old and new state

    Migration from: sublayers_server.handlers.teaching.ResetTeachingHandler
    """
    if not user:
        return PlainTextResponse("Not Authorized")

    last_state = user.teaching_state
    user.teaching_state = state
    await user.save()

    logger.info(
        f"Reset teaching state for {user.username}: "
        f"{last_state} → {state}"
    )

    return PlainTextResponse(
        f"OK! new_state = {state}    last state = {last_state}"
    )


@router.get("/teaching/status")
async def get_teaching_status(
    user: CurrentUser,
) -> dict[str, str | int | None]:
    """
    Get current teaching/tutorial status for user.

    Args:
        user: Current authenticated user

    Returns:
        Teaching status information
    """
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )

    return {
        "teaching_state": user.teaching_state,
        "car_index": user.car_index,
        "quick_mode": user.quick,
        "is_tester": user.is_tester,
    }
