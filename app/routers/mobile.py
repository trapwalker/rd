"""Mobile client routes."""

import logging

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from app.config import get_settings
from app.core.deps import get_optional_user_from_cookie
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


@router.get("/mobile/header", response_class=HTMLResponse)
@migration_target("sublayers_server.handlers.mobile.MobileHeaderHandler")
async def mobile_header_handler(
    request: Request,
) -> HTMLResponse:
    """
    Serve mobile header HTML.

    Returns CSS and JS includes for mobile client.
    No authentication required (public).

    Returns:
        HTML response with mobile header

    Migration from: sublayers_server.handlers.mobile.MobileHeaderHandler
    """
    if not templates:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Templates not configured"
        )

    logger.info("Mobile header requested")

    return templates.TemplateResponse(
        "mobile/header.html",
        {
            "request": request,
            "is_mobile": True,
        }
    )


@router.get("/mobile/content", response_class=HTMLResponse)
@migration_target("sublayers_server.handlers.mobile.MobileContentHandler")
async def mobile_content_handler(
    request: Request,
) -> HTMLResponse:
    """
    Serve mobile content HTML.

    Returns main mobile game interface.
    No authentication required (quick registration handled on client).

    Returns:
        HTML response with mobile content

    Migration from: sublayers_server.handlers.mobile.MobileContentHandler
    """
    if not templates:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Templates not configured"
        )

    # TODO: Implement quick registration
    # self._quick_registration()

    logger.info("Mobile content requested")

    return templates.TemplateResponse(
        "mobile/content.html",
        {
            "request": request,
            "ws_port": settings.ws_port if hasattr(settings, 'ws_port') else 8000,
            "map_link": settings.map_link if hasattr(settings, 'map_link') else "",
            "host_name": settings.mobile_host if hasattr(settings, 'mobile_host') else "",
            "is_mobile": True,
        }
    )
